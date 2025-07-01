const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

class WebTextProofreader {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 2;
    this.pagesPerBatch = options.pagesPerBatch || 6; // デフォルト6ページで分割
    this.results = [];
    this.errors = [];
  }

  async loadUrls() {
    try {
      const urlsPath = path.join(__dirname, 'urls.txt');
      const content = await fs.readFile(urlsPath, 'utf-8');
      
      return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    } catch (error) {
      throw new Error(`URLリストファイルの読み込みに失敗しました: ${error.message}`);
    }
  }

  async extractTextFromPage(browser, url) {
    console.log(`Processing: ${url}`);
    
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      // まずmainタグ内のテキストを取得を試行
      let textContent = await page.$eval('main', el => el.innerText).catch(() => null);
      
      // mainタグがない場合、bodyタグ内のテキストを取得
      if (!textContent || textContent.trim().length === 0) {
        textContent = await page.$eval('body', el => el.innerText).catch(() => null);
      }
      
      await page.close();
      
      if (!textContent || textContent.trim().length === 0) {
        this.errors.push({
          url,
          error: 'テキストコンテンツが見つかりませんでした'
        });
        return null;
      }

      return {
        url,
        originalText: textContent,
        wordCount: textContent.split(/\s+/).length
      };

    } catch (error) {
      this.errors.push({
        url,
        error: `アクセスエラー: ${error.message}`
      });
      return null;
    }
  }

  async processUrls(urls) {
    const browser = await chromium.launch({ headless: true });
    
    try {
      const chunks = [];
      
      // URLを2つずつのチャンクに分割
      for (let i = 0; i < urls.length; i += this.maxConcurrent) {
        chunks.push(urls.slice(i, i + this.maxConcurrent));
      }

      for (const chunk of chunks) {
        console.log(`\n=== Processing batch: ${chunk.join(', ')} ===`);
        
        const promises = chunk.map(url => this.extractTextFromPage(browser, url));
        const textResults = await Promise.all(promises);
        
        // 取得したテキストを保存
        for (const textData of textResults) {
          if (textData) {
            this.results.push({
              url: textData.url,
              originalText: textData.originalText,
              wordCount: textData.wordCount,
            });
          }
        }
      }
    } finally {
      await browser.close();
    }
  }

  generateInitialReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const totalPages = this.results.length;
    
    // 6ページ以下の場合は従来通り単一ファイル
    if (totalPages <= this.pagesPerBatch) {
      return this.generateSingleReport(timestamp);
    }
    
    // 6ページを超える場合はバッチ分割
    return this.generateBatchReports(timestamp);
  }

  generateSingleReport(timestamp) {
    const reportPath = `text-extraction/text-extraction-${timestamp}.md`;
    
    let report = `# Text Extraction Report\n\n`;
    report += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    // 成功した抽出結果
    if (this.results.length > 0) {
      report += `## Extracted Text (${this.results.length} pages)\n\n`;
      
      this.results.forEach((result, index) => {
        report += `### ${index + 1}. ${result.url}\n\n`;
        report += `**Word Count:** ${result.wordCount}\n\n`;
        report += `**Extracted Text:**\n\`\`\`\n${result.originalText}\n\`\`\`\n\n`;
        report += `---\n\n`;
      });
    }
    
    // エラーの報告
    if (this.errors.length > 0) {
      report += `## Errors (${this.errors.length} pages)\n\n`;
      
      this.errors.forEach((error, index) => {
        report += `### ${index + 1}. ${error.url}\n`;
        report += `**Error:** ${error.error}\n\n`;
      });
    }
    
    // サマリー
    const totalProcessed = this.results.length + this.errors.length;
    
    report += `## Summary\n\n`;
    report += `- **Total URLs:** ${totalProcessed}\n`;
    report += `- **Successfully processed:** ${this.results.length}\n`;
    report += `- **Errors:** ${this.errors.length}\n\n`;
    report += `Ready for proofreading by Cursor LLM.\n`;
    
    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 Text extraction report: ${reportPath}`);
    
    return [reportPath];
  }

  generateBatchReports(timestamp) {
    const batchSize = this.pagesPerBatch;
    const batches = [];
    const reportPaths = [];
    
    // 結果をバッチに分割
    for (let i = 0; i < this.results.length; i += batchSize) {
      batches.push(this.results.slice(i, i + batchSize));
    }
    
    console.log(`\n📄 Splitting into ${batches.length} batches (${batchSize} pages per batch)`);
    
    // 各バッチのレポートを生成
    batches.forEach((batch, batchIndex) => {
      const batchNum = batchIndex + 1;
      const reportPath = `text-extraction/text-extraction-batch-${batchNum}-${timestamp}.md`;
      
      let report = `# Text Extraction Report - Batch ${batchNum}/${batches.length}\n\n`;
      report += `Generated: ${new Date().toLocaleString()}\n`;
      report += `Batch: ${batchNum} of ${batches.length} (Pages ${batchIndex * batchSize + 1}-${Math.min((batchIndex + 1) * batchSize, this.results.length)})\n\n`;
      
      // バッチ内の抽出結果
      report += `## Extracted Text (${batch.length} pages in this batch)\n\n`;
      
      batch.forEach((result, index) => {
        const globalIndex = batchIndex * batchSize + index + 1;
        report += `### ${globalIndex}. ${result.url}\n\n`;
        report += `**Word Count:** ${result.wordCount}\n\n`;
        report += `**Extracted Text:**\n\`\`\`\n${result.originalText}\n\`\`\`\n\n`;
        report += `---\n\n`;
      });
      
      // バッチサマリー
      report += `## Batch Summary\n\n`;
      report += `- **Batch:** ${batchNum}/${batches.length}\n`;
      report += `- **Pages in this batch:** ${batch.length}\n`;
      report += `- **Total word count:** ${batch.reduce((sum, r) => sum + r.wordCount, 0)}\n\n`;
      report += `Ready for proofreading by Cursor LLM.\n`;
      
      fs.writeFileSync(reportPath, report);
      reportPaths.push(reportPath);
      console.log(`📄 Batch ${batchNum} report: ${reportPath}`);
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
      console.log(`📄 Error report: ${errorReportPath}`);
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
    
    summaryReport += `## Batch Files\n\n`;
    batches.forEach((batch, index) => {
      const batchNum = index + 1;
      summaryReport += `- **Batch ${batchNum}:** text-extraction-batch-${batchNum}-${timestamp}.md (${batch.length} pages)\n`;
    });
    
    if (this.errors.length > 0) {
      summaryReport += `- **Errors:** text-extraction-errors-${timestamp}.md (${this.errors.length} pages)\n`;
    }
    
    summaryReport += `\nReady for proofreading by Cursor LLM.\n`;
    
    fs.writeFileSync(summaryReportPath, summaryReport);
    reportPaths.push(summaryReportPath);
    console.log(`📄 Summary report: ${summaryReportPath}`);
    
    return reportPaths;
  }

  async run() {
    try {
      console.log('🔍 Web Text Proofreader Starting...\n');
      
      const urls = await this.loadUrls();
      
      if (urls.length === 0) {
        console.log('❌ No URLs found in urls.txt');
        return;
      }
      
      console.log(`📋 Found ${urls.length} URLs to process`);
      console.log(`⚙️  Max concurrent processing: ${this.maxConcurrent}`);
      console.log(`⚙️  Pages per batch: ${this.pagesPerBatch}\n`);
      
      await this.processUrls(urls);
      
      const reportPaths = this.generateInitialReport();
      
      console.log('\n✅ Text extraction completed!');
      if (Array.isArray(reportPaths)) {
        console.log(`📊 Generated ${reportPaths.length} report files:`);
        reportPaths.forEach(path => console.log(`   - ${path}`));
      } else {
        console.log(`📊 Check the report: ${reportPaths}`);
      }
      
      return {
        results: this.results,
        errors: this.errors,
        reportPaths: Array.isArray(reportPaths) ? reportPaths : [reportPaths],
        totalPages: this.results.length,
        batchCount: this.results.length > this.pagesPerBatch ? Math.ceil(this.results.length / this.pagesPerBatch) : 1
      };
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      throw error;
    }
  }
}

// メイン実行
if (require.main === module) {
  const proofreader = new WebTextProofreader();
  proofreader.run();
}

module.exports = WebTextProofreader; 