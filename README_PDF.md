# PDF成果物生成システム

勤怠管理システムのPDF成果物を自動生成するPythonアプリケーションです。

## 生成されるPDF一覧

1. **バリデーションチェックリスト.pdf**
   - 15カテゴリ・100項目をテーブル形式で整理
   - 出退勤/有給/月末申請/セキュリティ/データ保護 etc

2. **テスト仕様書.pdf**
   - ユニットテスト一覧（TimeCalculatorTest, AttendanceServiceTest, VacationServiceTest, etc）
   - 統合テストケース（出勤→退勤→月末申請→有給申請フロー）

3. **テスト結果レポート.pdf**
   - `mvn test` の結果サマリを PDF化
   - 全テスト成功の証跡を含む

4. **利用手順書.pdf**
   - 起動方法: `mvn spring-boot:run`
   - API サンプル: curl コマンド（出勤・退勤・有給・月末申請）
   - ロールバック手順（git reset, DB削除）

## セットアップ

### 1. 依存関係のインストール

```bash
pip install -r requirements.txt
```

### 2. 直接PDF生成

```bash
python pdf_generator.py
```

### 3. APIサーバー起動

```bash
python app.py
```

APIサーバーが起動すると、以下のエンドポイントが利用可能になります：

- `GET /` - API概要
- `GET /api/docs/list` - 利用可能なPDF一覧
- `GET /api/docs/{type}` - PDFダウンロード
- `GET /api/docs/generate-all` - 全PDF一括生成
- `GET /health` - ヘルスチェック

## 使用方法

### 直接PDF生成

```bash
# すべてのPDFを生成
python pdf_generator.py
```

### API経由でのPDF生成

```bash
# APIサーバー起動
python app.py

# 別のターミナルでPDFダウンロード
curl -X GET http://localhost:5000/api/docs/validation-checklist -o validation.pdf
curl -X GET http://localhost:5000/api/docs/test-specification -o test_spec.pdf
curl -X GET http://localhost:5000/api/docs/test-report -o test_report.pdf
curl -X GET http://localhost:5000/api/docs/user-manual -o user_manual.pdf
```

### 利用可能なPDFタイプ

- `validation-checklist` - バリデーションチェックリスト
- `test-specification` - テスト仕様書
- `test-report` - テスト結果レポート
- `user-manual` - 利用手順書

## テスト

```bash
# テスト実行
python test_pdf_generation.py
```

このテストスクリプトは以下を実行します：

1. PDF生成機能の直接テスト
2. APIエンドポイントのテスト
3. テストファイルのクリーンアップ

## 技術仕様

- **Python 3.7+**
- **ReportLab 4.0.4** - PDF生成ライブラリ
- **Flask 2.3.3** - Web API フレームワーク
- **A4サイズ** - 標準的な文書サイズ
- **UTF-8エンコーディング** - 日本語対応

## ファイル構成

```
kintai/
├── pdf_generator.py          # PDF生成メインクラス
├── app.py                    # Flask API サーバー
├── test_pdf_generation.py    # テストスクリプト
├── requirements.txt          # Python依存関係
└── README_PDF.md            # このファイル
```

## 生成されるPDFの特徴

### バリデーションチェックリスト
- 5つの主要カテゴリ（出退勤、有給申請、月末申請、セキュリティ、データ保護）
- 各カテゴリ8項目の詳細チェックリスト
- テーブル形式で見やすく整理
- チェックボックス付きで実用的

### テスト仕様書
- ユニットテストと統合テストに分類
- 各テストクラスの詳細なテストケース
- 期待結果とステータス列付き
- 実際のテスト実行に使用可能

### テスト結果レポート
- テスト実行サマリ（総数、成功数、失敗数、成功率）
- 詳細なテスト結果一覧
- 実行時間の記録
- 成功の証跡として使用可能

### 利用手順書
- システム概要と技術スタック
- 詳細な起動手順
- 全APIの使用例（curlコマンド付き）
- ロールバック手順
- トラブルシューティングガイド

## 注意事項

- PDFファイルは一時ファイルとして生成され、ダウンロード後に自動削除されます
- 大量のPDF生成時はメモリ使用量にご注意ください
- 日本語フォントはReportLabのデフォルトフォントを使用しています
