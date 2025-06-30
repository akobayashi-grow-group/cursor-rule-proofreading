# 校正レポート

**生成日時:** [TIMESTAMP]  
**処理対象:** [TOTAL_PAGES]ページ  
**校正エンジン:** Cursor LLM + proofreader.js

## 校正結果サマリー

| ページ | URL | 誤字・誤記数 | ステータス |
|--------|-----|-------------|------------|
[SUMMARY_TABLE_ROWS]

**総計:** [TOTAL_ERRORS]件の誤字・誤記を発見

## 詳細な校正結果

[DETAILED_RESULTS]

---

## 処理統計

- **処理時間:** [PROCESSING_TIME]
- **総文字数:** [TOTAL_CHARS]文字
- **誤記発見率:** [ERROR_RATE]%（[TOTAL_ERRORS]件/[TOTAL_CHARS]文字）
- **正常ページ:** [CLEAN_PAGES]ページ（[CLEAN_PERCENTAGE]%）
- **要修正ページ:** [ERROR_PAGES]ページ（[ERROR_PERCENTAGE]%）

---

*本レポートは、既存のproofreader.jsによるテキスト抽出とCursor LLMによる校正を組み合わせて生成されました。*

## テンプレート使用方法

### プレースホルダー一覧

- `[TIMESTAMP]`: 生成日時
- `[TOTAL_PAGES]`: 処理対象ページ数
- `[SUMMARY_TABLE_ROWS]`: サマリーテーブルの行データ
- `[TOTAL_ERRORS]`: 発見した誤字・誤記の総数
- `[DETAILED_RESULTS]`: 詳細な校正結果
- `[PROCESSING_TIME]`: 処理時間
- `[TOTAL_CHARS]`: 総文字数
- `[ERROR_RATE]`: 誤記発見率
- `[CLEAN_PAGES]`: 正常ページ数
- `[CLEAN_PERCENTAGE]`: 正常ページの割合
- `[ERROR_PAGES]`: 要修正ページ数
- `[ERROR_PERCENTAGE]`: 要修正ページの割合

### サマリーテーブル行の形式
```
| [PAGE_NUM] | [URL_PATH] ([TITLE]) | [ERROR_COUNT] | [STATUS_ICON] [STATUS_TEXT] |
```

### 詳細結果の形式
```
### [PAGE_NUM]. [TITLE]（[ERROR_COUNT]件）

**誤記箇所 [ERROR_NUM]:**
- **位置:** [CONTEXT]
- **誤り:** [ERROR_TEXT]
- **修正案:** [CORRECTION]
- **理由:** [REASON]

---
```

### ステータスアイコン
- `✅ 正常`: 誤字・誤記なし
- `⚠️ 誤記あり`: 誤字・誤記を発見 