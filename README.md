# Cursor Proofreader

既存の`proofreader.js`とCursorのLLMを使って、WebページのテキストコンテンツをAIで校正するツールです。

## 機能

- 📄 URLリストからWebページのテキスト自動取得（`proofreader.js`）
- 🔍 mainタグ優先、フォールバックでbodyタグからテキスト抽出
- 🤖 CursorのLLMによる誤字・誤記の自動校正
- 📊 詳細なレポート生成（抽出結果と校正結果の2段階）
- ⚡ 並列処理対応（最大2ページ同時）
- 🌐 日本語・英語対応

## セットアップ

### 必要要件

- Node.js 18以上
- Cursor Editor

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

Cursorで以下のいずれかを入力するだけで**自動実行**されます：

- 「校正して」
- 「校正」  
- 「チェック」
- 「lint」

## 実行される内容

自動実行時は以下の2段階で処理されます：

### ステップ1: テキスト抽出
```bash
node proofreader.js
```
- `text-extraction-[timestamp].md`ファイルが生成されます
- 各URLからテキストが抽出され、校正用のプロンプトが準備されます

### ステップ2: LLM校正
- 抽出されたテキストに対してCursorのLLMが校正を実行
- `proofreading-report-[timestamp].md`ファイルが生成されます

## 結果の確認方法

最終的に以下の2つのレポートファイルが生成されます：

1. **`text-extraction-[timestamp].md`**: テキスト抽出結果
2. **`proofreading-report-[timestamp].md`**: 校正結果と統計

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

### Playwrightブラウザが見つからない場合

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
[urls.txt] → [proofreader.js] → [Web Pages] → [Text Extraction] → [LLM Proofreading] → [Reports]
```

### 処理フロー

1. URLリスト読み込み（`proofreader.js`）
2. 2つずつ並列でWebページアクセス
3. テキスト抽出（main → body フォールバック）
4. テキスト抽出レポート生成
5. CursorのLLMによる校正処理
6. 最終校正レポート生成

### エラーハンドリング

- アクセス不可URL: スキップして継続
- テキストなし: エラーレポートに記録
- 処理タイムアウト: 個別にスキップ

### 重要な制約事項

- **既存の`proofreader.js`を使用**: 新しいJavaScriptファイルは作成されません
- **レポートファイルのみ新規作成**: `.md`ファイルのみが新規生成されます
- **同時処理制限**: 最大2URL同時処理（`proofreader.js`内で制御済み）
