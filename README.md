# Text Linter - Cursor Rules

## 概要

URLリストからWebページのテキストを取得し、誤字・脱字の校正を行うPlaywrightとCursor Rulesの組み合わせです。

## 機能

- URLリストからWebページのテキスト自動取得（`proofreader.js`）
- Cursorによる誤字・誤記の自動校正
- 詳細なレポート生成（抽出結果と校正結果の2段階）

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

### 2. 自動実行

Cursorで以下のいずれかを入力するだけで**自動実行**されます：

- 「校正して」
- 「校正」  
- 「チェック」
- 「lint」

## 自動実行の処理フロー

入力されたキーワードに応じて、以下の処理が自動的に実行されます：

### ステップ1: 事前チェック
- `urls.txt`、`proofreader.js`ファイルの存在確認
- `node_modules`がなければ `npm install` を実行

### ステップ2: テキスト抽出
```bash
node proofreader.js
```
- 各URLからテキストが抽出されます
- `text-extraction/text-extraction-[timestamp].md`ファイルが生成されます

### ステップ3: 校正実行
- 各ページのテキストをLLMが校正します

### ステップ4: 最終レポート生成
- `report-template.md`テンプレートを使用して`report/proofreading-report-[timestamp].md`ファイルが生成されます


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

## ファイル構成

```
cursor-rule-proofreading/
├── package.json              # プロジェクト設定・依存関係
├── proofreader.js            # メインのテキスト抽出スクリプト
├── urls.txt                  # 校正対象URLリスト
├── report-template.md        # レポート生成用テンプレート
├── report/                   # 最終校正レポート格納ディレクトリ
└── text-extraction/          # テキスト抽出結果格納ディレクトリ
```
