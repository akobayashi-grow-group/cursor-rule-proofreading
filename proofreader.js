const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

class WebTextProofreader {
  constructor() {
    this.maxConcurrent = 2;
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
    const reportPath = `text-extraction-${timestamp}.md`;
    
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
    
    return reportPath;
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
      console.log(`⚙️  Max concurrent processing: ${this.maxConcurrent}\n`);
      
      await this.processUrls(urls);
      
      const reportPath = this.generateInitialReport();
      
      console.log('\n✅ Text extraction completed!');
      console.log(`📊 Check the report: ${reportPath}`);
      
      return this.results;
      
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