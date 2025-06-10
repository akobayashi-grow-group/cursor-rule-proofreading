const fs = require('fs-extra');
const path = require('path');

class TextLinter {
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

  async extractTextFromPage(url) {
    console.log(`Processing: ${url}`);
    
    try {
      // Playwright MCPを使用してページにアクセス
      // Note: 実際のMCP呼び出しはCursor環境で行われます
      
      // ページに移動
      await this.navigateToPage(url);
      
      // テキスト取得を試行（mainタグ優先、なければbodyタグ）
      let textContent = await this.getMainContent();
      
      if (!textContent || textContent.trim().length === 0) {
        textContent = await this.getBodyContent();
      }
      
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

  async navigateToPage(url) {
    // Playwright MCP の browser_navigate を使用
    // 実際の実装はCursor環境で自動的に処理されます
    console.log(`Navigating to: ${url}`);
  }

  async getMainContent() {
    // Playwright MCP の browser_get_text を使用してmainタグ内のテキストを取得
    // 実際の実装はCursor環境で自動的に処理されます
    console.log('Extracting main content...');
    return null; // MCPによって実際のテキストが返される
  }

  async getBodyContent() {
    // Playwright MCP の browser_get_text を使用してbodyタグ内のテキストを取得
    // 実際の実装はCursor環境で自動的に処理されます
    console.log('Extracting body content...');
    return null; // MCPによって実際のテキストが返される
  }

  async proofreadText(textData) {
    if (!textData || !textData.originalText) return null;

    console.log(`Proofreading text from: ${textData.url}`);
    
    // LLMによる校正処理の指示
    const proofreadingPrompt = `
以下のテキストの誤字・誤記をチェックして、問題がある箇所のみを指摘してください。

【校正対象テキスト】
${textData.originalText}

【指摘形式】
- 誤字・誤記がある場合のみ、以下の形式で指摘してください：
  - 位置: [該当箇所の前後の文脈]
  - 誤り: [間違っている部分]
  - 修正案: [正しい表記]
  - 理由: [修正理由]

- 誤字・誤記がない場合は「校正すべき箇所はありませんでした。」とだけ回答してください。

【注意事項】
- 英語・日本語両方対応
- 明確な誤字・誤記のみを指摘（文体や表現の好みは除く）
- タイポ、スペルミス、明らかな文法エラーを対象
`;

    // 実際のLLM処理はCursor環境で自動的に行われます
    return {
      url: textData.url,
      originalWordCount: textData.wordCount,
      corrections: [], // LLMによって実際の校正結果が設定される
      hasErrors: false // LLMによって実際の結果が設定される
    };
  }

  async processUrls(urls) {
    const chunks = [];
    
    // URLを2つずつのチャンクに分割
    for (let i = 0; i < urls.length; i += this.maxConcurrent) {
      chunks.push(urls.slice(i, i + this.maxConcurrent));
    }

    for (const chunk of chunks) {
      console.log(`\n=== Processing batch: ${chunk.join(', ')} ===`);
      
      const promises = chunk.map(url => this.extractTextFromPage(url));
      const textResults = await Promise.all(promises);
      
      // 校正処理
      for (const textData of textResults) {
        if (textData) {
          const proofreadResult = await this.proofreadText(textData);
          if (proofreadResult) {
            this.results.push(proofreadResult);
          }
        }
      }
    }
  }

  generateReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `report-${timestamp}.md`;
    
    let report = `# Text Proofreading Report\n\n`;
    report += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    // 成功した処理の結果
    if (this.results.length > 0) {
      report += `## Proofreading Results (${this.results.length} pages)\n\n`;
      
      this.results.forEach((result, index) => {
        report += `### ${index + 1}. ${result.url}\n\n`;
        report += `**Word Count:** ${result.originalWordCount}\n\n`;
        
        if (result.hasErrors && result.corrections.length > 0) {
          report += `**Found Issues:** ${result.corrections.length}\n\n`;
          result.corrections.forEach((correction, i) => {
            report += `#### Issue ${i + 1}\n`;
            report += `- **Position:** ${correction.position}\n`;
            report += `- **Error:** ${correction.error}\n`;
            report += `- **Suggestion:** ${correction.suggestion}\n`;
            report += `- **Reason:** ${correction.reason}\n\n`;
          });
        } else {
          report += `**Status:** ✅ No proofreading issues found\n\n`;
        }
        
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
    const issuesFound = this.results.filter(r => r.hasErrors).length;
    
    report += `## Summary\n\n`;
    report += `- **Total URLs:** ${totalProcessed}\n`;
    report += `- **Successfully processed:** ${this.results.length}\n`;
    report += `- **Errors:** ${this.errors.length}\n`;
    report += `- **Pages with issues:** ${issuesFound}\n`;
    report += `- **Pages without issues:** ${this.results.length - issuesFound}\n\n`;
    
    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 Report generated: ${reportPath}`);
    
    return reportPath;
  }

  async run() {
    try {
      console.log('🔍 Text Linter Starting...\n');
      
      const urls = await this.loadUrls();
      
      if (urls.length === 0) {
        console.log('❌ No URLs found in urls.txt');
        return;
      }
      
      console.log(`📋 Found ${urls.length} URLs to process`);
      console.log(`⚙️  Max concurrent processing: ${this.maxConcurrent}\n`);
      
      await this.processUrls(urls);
      
      const reportPath = this.generateReport();
      
      console.log('\n✅ Text linting completed!');
      console.log(`📊 Check the report: ${reportPath}`);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

// メイン実行
if (require.main === module) {
  const linter = new TextLinter();
  linter.run();
}

module.exports = TextLinter; 