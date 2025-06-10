# Text Linter

Playwright MCPとCursor Agentを使用して、WebページのテキストコンテンツをAIで校正するツールです。

## 機能

- 📄 URLリストからWebページのテキスト自動取得
- 🔍 mainタグ優先、フォールバックでbodyタグからテキスト抽出
- 🤖 CursorのLLMによる誤字・誤記の自動校正
- 📊 詳細なレポート生成
- ⚡ 並列処理対応（最大2ページ同時）
- 🌐 日本語・英語対応

## セットアップ

### 必要要件

- Node.js 18以上
- Cursor Editor
- Playwright MCP サーバー

### インストール

```bash
npm install
```

## 使用方法

### 1. URLリストの準備

`urls.txt`ファイルにチェックしたいURLを1行ずつ記載してください：

```
https://example.com
https://example.org/article
https://blog.example.net/post/123
```

コメント行（#で始まる行）は無視されます。

### 2. 校正の実行

Cursorで以下のいずれかを入力するだけで自動実行されます：

- 「校正して」
- 「校正」
- 「チェック」
- 「lint」

### 3. 結果の確認

処理完了後、`report-[timestamp].md`ファイルが生成されます。このレポートには以下が含まれます：

- 各ページの校正結果
- 発見された誤字・誤記の詳細
- アクセスエラーの報告
- 処理統計

## 校正仕様

### 対象
- **優先**: `<main>`タグ内のテキストコンテンツ
- **フォールバック**: `<body>`タグ内のテキストコンテンツ

### 校正範囲
- ✅ 誤字・タイポ
- ✅ スペルミス
- ✅ 明らかな文法エラー
- ❌ 文体の好み
- ❌ 表現の改善提案

### 対応言語
- 日本語
- 英語

## レポート例

```markdown
# Text Proofreading Report

Generated: 2024/12/19 14:30:25

## Proofreading Results (3 pages)

### 1. https://example.com

**Word Count:** 245

**Found Issues:** 2

#### Issue 1
- **Position:** この文章には間違いが含まている可能性があります
- **Error:** 含まている
- **Suggestion:** 含まれている
- **Reason:** 助詞の活用形が不適切

#### Issue 2
- **Position:** We recieved your message yesterday
- **Error:** recieved
- **Suggestion:** received
- **Reason:** スペルミス

### 2. https://example.org

**Status:** ✅ No proofreading issues found

## Summary

- **Total URLs:** 3
- **Successfully processed:** 2
- **Errors:** 1
- **Pages with issues:** 1
- **Pages without issues:** 1
```

## トラブルシューティング

### Playwright MCPが利用できない場合

Cursor環境でPlaywright MCPサーバーが設定されていることを確認してください。

### ブラウザが見つからない場合

以下のコマンドでブラウザをインストールしてください：

```bash
npx playwright install
```

### URLにアクセスできない場合

- ネットワーク接続を確認してください
- URLが正しいことを確認してください
- アクセス制限があるサイトはスキップされます

## 技術詳細

### アーキテクチャ

```
[urls.txt] → [Playwright MCP] → [Web Pages] → [Text Extraction] → [LLM Proofreading] → [Report]
```

### 処理フロー

1. URLリスト読み込み
2. 2つずつ並列でWebページアクセス
3. テキスト抽出（main → body フォールバック）
4. LLMによる校正処理
5. 結果をレポートに集約

### エラーハンドリング

- アクセス不可URL: スキップして継続
- テキストなし: エラーレポートに記録
- 処理タイムアウト: 個別にスキップ

## ライセンス

MIT License

## 開発・貢献

Issue報告やPull Requestは歓迎します。

---

**作成者**: Cursor Agent Tool 