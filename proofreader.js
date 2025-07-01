const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

/**
 * URLリストからWebページのテキストを抽出し、校正用のレポートを生成する
 */
class WebTextProofreader {
  /**
   * コンストラクタ
   * @param {Object} options - 設定オプション
   */
  constructor(options = {}) {
    // 同時処理するページ数の上限（デフォルト: 2）
    this.maxConcurrent = options.maxConcurrent || 2;
    // バッチ分割の単位（デフォルト:4ページ）
    this.pagesPerBatch = options.pagesPerBatch || 4;
    // テキスト抽出結果を格納する配列
    this.results = [];
    // エラー情報を格納する配列
    this.errors = [];
  }

  /**
   * urls.txtファイルからURLリストを読み込む
   * @returns {Array<string>} URLの配列
   */
  async loadUrls() {
    try {
      // urls.txtファイルのパスを構築
      const urlsPath = path.join(__dirname, 'urls.txt');
      // ファイル内容を読み込み
      const content = await fs.readFile(urlsPath, 'utf-8');
      
      // 各行を処理してURLリストを作成
      return content
        .split('\n')                    // 改行で分割
        .map(line => line.trim())       // 前後の空白を除去
        .filter(line => line && !line.startsWith('#')); // 空行とコメント行を除外
    } catch (error) {
      throw new Error(`URLリストファイルの読み込みに失敗しました: ${error.message}`);
    }
  }

  /**
   * 指定されたURLからテキストを抽出する
   * @param {Browser} browser - Playwrightのブラウザインスタンス
   * @param {string} url - 抽出対象のURL
   * @returns {Object|null} 抽出結果またはnull
   */
  async extractTextFromPage(browser, url) {
    console.log(`Processing: ${url}`);
    
    try {
      
      // ページにアクセス（ネットワークアイドル状態まで待機、30秒でタイムアウト）
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      // まずmainタグ内のテキストを取得を試行
      let textContent = await page.$eval('main', el => el.innerText).catch(() => null);
      
      // mainタグがない場合、bodyタグ内のテキストを取得
      if (!textContent || textContent.trim().length === 0) {
        textContent = await page.$eval('body', el => el.innerText).catch(() => null);
      }
      
      // ページを閉じてメモリを解放
      await page.close();
      
      // テキストが取得できなかった場合はエラーとして記録
      if (!textContent || textContent.trim().length === 0) {
        this.errors.push({
          url,
          error: 'テキストコンテンツが見つかりませんでした'
        });
        return null;
      }

      // 抽出結果を返す
      return {
        url,                                           // 元のURL
        originalText: textContent,                     // 抽出されたテキスト
      };

    } catch (error) {
      // アクセスエラーや処理エラーを記録
      this.errors.push({
        url,
        error: `アクセスエラー: ${error.message}`
      });
      return null;
    }
  }

  /**
   * URLリストを処理してテキストを抽出する
   * @param {Array<string>} urls - 処理対象のURLリスト
   */
  async processUrls(urls) {
    // Chromiumブラウザを起動（ヘッドレスモード）
    const browser = await chromium.launch({ headless: true });
    
    try {
      const chunks = [];
      
      // 負荷分散のためURLを同時処理数に応じてチャンクに分割
      for (let i = 0; i < urls.length; i += this.maxConcurrent) {
        chunks.push(urls.slice(i, i + this.maxConcurrent));
      }

      // 各チャンクを順次処理
      for (const chunk of chunks) {
        
        // チャンク内のURLを並列処理
        const promises = chunk.map(url => this.extractTextFromPage(browser, url));
        const textResults = await Promise.all(promises);
        
        // 取得したテキストを保存
        for (const textData of textResults) {
          if (textData) {
            this.results.push({
              url: textData.url,
              originalText: textData.originalText,
            });
          }
        }
      }
    } finally {
      await browser.close();
    }
  }

  /**
   * text-extractionフォルダにレポートを生成する
   * @returns {Array<string>} 生成されたレポートファイルのパス配列
   */
  generateInitialReport() {
    // タイムスタンプを生成（ファイル名に使用）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const totalPages = this.results.length;
    
    // 6ページ以下の場合は従来通り単一ファイル
    if (totalPages <= this.pagesPerBatch) {
      return this.generateSingleReport(timestamp);
    }
    
    // 6ページを超える場合はバッチ分割
    return this.generateBatchReports(timestamp);
  }

  /**
   * 単一の統合レポートを生成する（6ページ以下の場合）
   * @param {string} timestamp - ファイル名用のタイムスタンプ
   * @returns {Array<string>} 生成されたレポートファイルのパス配列
   */
  generateSingleReport(timestamp) {
    const reportPath = `text-extraction/text-extraction-${timestamp}.md`;
    
    // レポートヘッダーを作成
    let report = `# Text Extraction Report\n\n`;
    report += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    // 成功した抽出結果をレポートに追加
    if (this.results.length > 0) {
      report += `## Extracted Text (${this.results.length} pages)\n\n`;
      
      // 各ページの抽出結果を順次追加
      this.results.forEach((result, index) => {
        report += `### ${index + 1}. ${result.url}\n\n`;
        report += `**Extracted Text:**\n\`\`\`\n${result.originalText}\n\`\`\`\n\n`;
        report += `---\n\n`;
      });
    }
    
    // エラーがあった場合はエラーセクションを追加
    if (this.errors.length > 0) {
      report += `## Errors (${this.errors.length} pages)\n\n`;
      
      this.errors.forEach((error, index) => {
        report += `### ${index + 1}. ${error.url}\n`;
        report += `**Error:** ${error.error}\n\n`;
      });
    }
    
    // サマリーセクションを追加
    const totalProcessed = this.results.length + this.errors.length;
    
    report += `## Summary\n\n`;
    report += `- **Total URLs:** ${totalProcessed}\n`;
    report += `- **Successfully processed:** ${this.results.length}\n`;
    report += `- **Errors:** ${this.errors.length}\n\n`;
    
    // レポートファイルを書き込み
    fs.writeFileSync(reportPath, report);
    
    return [reportPath];
  }

  /**
   * バッチ分割レポートを生成する（7ページ以上の場合）
   * @param {string} timestamp - ファイル名用のタイムスタンプ
   * @returns {Array<string>} 生成されたレポートファイルのパス配列
   */
  generateBatchReports(timestamp) {
    const batchSize = this.pagesPerBatch;
    const batches = [];
    const reportPaths = [];
    
    // 結果をバッチサイズに応じて分割
    for (let i = 0; i < this.results.length; i += batchSize) {
      batches.push(this.results.slice(i, i + batchSize));
    }
  
    // 各バッチのレポートを生成
    batches.forEach((batch, batchIndex) => {
      const batchNum = batchIndex + 1;
      const reportPath = `text-extraction/text-extraction-batch-${batchNum}-${timestamp}.md`;
      
      // バッチレポートのヘッダーを作成
      let report = `# Text Extraction Report - Batch ${batchNum}/${batches.length}\n\n`;
      report += `Generated: ${new Date().toLocaleString()}\n`;
      report += `Batch: ${batchNum} of ${batches.length} (Pages ${batchIndex * batchSize + 1}-${Math.min((batchIndex + 1) * batchSize, this.results.length)})\n\n`;
      
      // バッチ内の抽出結果を追加
      report += `## Extracted Text (${batch.length} pages in this batch)\n\n`;
      
      batch.forEach((result, index) => {
        // 全体での通し番号を計算
        const globalIndex = batchIndex * batchSize + index + 1;
        report += `### ${globalIndex}. ${result.url}\n\n`;
        report += `**Extracted Text:**\n\`\`\`\n${result.originalText}\n\`\`\`\n\n`;
        report += `---\n\n`;
      });
      
      // バッチサマリーを追加
      report += `## Batch Summary\n\n`;
      report += `- **Batch:** ${batchNum}/${batches.length}\n`;
      report += `- **Pages in this batch:** ${batch.length}\n`;
      
      // バッチレポートファイルを書き込み
      fs.writeFileSync(reportPath, report);
      reportPaths.push(reportPath);
    });
    
    // エラーがある場合は別途エラーレポートを生成
    if (this.errors.length > 0) {
      const errorReportPath = `text-extraction/text-extraction-errors-${timestamp}.md`;
      let errorReport = `# Text Extraction Errors\n\n`;
      errorReport += `Generated: ${new Date().toLocaleString()}\n\n`;
      errorReport += `## Errors (${this.errors.length} pages)\n\n`;
      
      this.errors.forEach((error, index) => {
        errorReport += `### ${index + 1}. ${error.url}\n`;
        errorReport += `**Error:** ${error.error}\n\n`;
      });
      
      fs.writeFileSync(errorReportPath, errorReport);
      reportPaths.push(errorReportPath);
    }
    
    // 全体サマリーレポートを生成
    const summaryReportPath = `text-extraction/text-extraction-summary-${timestamp}.md`;
    let summaryReport = `# Text Extraction Summary\n\n`;
    summaryReport += `Generated: ${new Date().toLocaleString()}\n\n`;
    summaryReport += `## Overall Summary\n\n`;
    summaryReport += `- **Total URLs:** ${this.results.length + this.errors.length}\n`;
    summaryReport += `- **Successfully processed:** ${this.results.length}\n`;
    summaryReport += `- **Errors:** ${this.errors.length}\n`;
    summaryReport += `- **Total batches:** ${batches.length}\n`;
    summaryReport += `- **Pages per batch:** ${batchSize}\n\n`;
    
    // 生成されたバッチファイルの一覧を追加
    summaryReport += `## Batch Files\n\n`;
    batches.forEach((batch, index) => {
      const batchNum = index + 1;
      summaryReport += `- **Batch ${batchNum}:** text-extraction-batch-${batchNum}-${timestamp}.md (${batch.length} pages)\n`;
    });
    
    if (this.errors.length > 0) {
      summaryReport += `- **Errors:** text-extraction-errors-${timestamp}.md (${this.errors.length} pages)\n`;
    }
    
    
    // サマリーレポートファイルを書き込み
    fs.writeFileSync(summaryReportPath, summaryReport);
    reportPaths.push(summaryReportPath);
    
    return reportPaths;
  }

  /**
   * メインの実行メソッド
   * 全体の処理フローを管理する
   * @returns {Object} 実行結果の統計情報
   */
  async run() {
    try {
      console.log('🔍 Web Text Proofreader Starting...\n');
      
      // URLリストの読み込み
      const urls = await this.loadUrls();
      
      // URLが見つからない場合は処理を終了
      if (urls.length === 0) {
        console.log('❌ No URLs found in urls.txt');
        return;
      }
      
      // 処理開始時の設定情報を表示
      console.log(`📋 Found ${urls.length} URLs to process`);
      console.log(`⚙️  Max concurrent processing: ${this.maxConcurrent}`);
      console.log(`⚙️  Pages per batch: ${this.pagesPerBatch}\n`);
      
      // URLの処理を実行
      await this.processUrls(urls);
      
      // レポート生成
      const reportPaths = this.generateInitialReport();
      
      // 処理完了の報告
      if (Array.isArray(reportPaths)) {
        console.log(`\n✅ Generated ${reportPaths.length} report files:`);
        reportPaths.forEach(path => console.log(`   - ${path}`));
      } else {
        console.log(`\n✅ Check the report: ${reportPaths}`);
      }
      
      // 実行結果の統計情報を返す
      return {
        results: this.results,                         // 抽出成功結果
        errors: this.errors,                           // エラー情報
        reportPaths: Array.isArray(reportPaths) ? reportPaths : [reportPaths], // 生成されたレポートパス
        totalPages: this.results.length,               // 成功したページ数
        batchCount: this.results.length > this.pagesPerBatch ? Math.ceil(this.results.length / this.pagesPerBatch) : 1 // バッチ数
      };
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      throw error;
    }
  }
}

// スクリプトが直接実行された場合のメイン処理
if (require.main === module) {
  const proofreader = new WebTextProofreader();
  proofreader.run();
}

// クラスをエクスポート（他のモジュールから使用可能にする）
module.exports = WebTextProofreader; 