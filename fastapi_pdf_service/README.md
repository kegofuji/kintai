# FastAPI PDF Service

勤怠レポートPDF生成専用マイクロサービス

## 概要

このサービスは、Spring Bootアプリケーションから勤怠レポートのPDF生成を担当するFastAPIマイクロサービスです。

## 機能

- 勤怠レポートPDFの生成
- 生成されたPDFファイルの配信
- PDFファイルの自動削除（24時間後）
- Spring Bootアプリケーションとの連携

## エンドポイント

### POST /reports/pdf
勤怠レポートPDFを生成する

**リクエスト:**
```json
{
  "employeeId": 2,
  "yearMonth": "2025-09"
}
```

**レスポンス:**
```json
{
  "url": "http://localhost:8081/reports/tmp/report_2_202509.pdf"
}
```

### GET /reports/tmp/{filename}
生成されたPDFファイルを取得する

### DELETE /reports/tmp/{filename}
指定されたPDFファイルを削除する

### GET /health
ヘルスチェック

## セットアップ

### 1. 依存関係のインストール

```bash
pip install -r requirements.txt
```

### 2. サービスの起動

```bash
./start_service.sh
```

または

```bash
uvicorn main:app --host 0.0.0.0 --port 8081 --reload
```

## 設定

### 環境変数

- `PDF_SERVICE_URL`: PDFサービスのURL（デフォルト: http://localhost:8081）
- `SPRING_BOOT_URL`: Spring BootアプリケーションのURL（デフォルト: http://localhost:8080）

## テスト

### テストの実行

```bash
pytest
```

### テストカバレッジ

```bash
pytest --cov=.
```

## API仕様書

サービス起動後、以下のURLでAPI仕様書を確認できます：

- Swagger UI: http://localhost:8081/docs
- ReDoc: http://localhost:8081/redoc

## アーキテクチャ

```
Spring Boot App (Port 8080)
    ↓ HTTP Request
FastAPI Service (Port 8081)
    ↓ HTTP Request
Spring Boot App (Data Access)
    ↓ PDF Generation
File System (tmp/)
```

## ファイル管理

- 生成されたPDFファイルは `tmp/` ディレクトリに保存されます
- ファイルは24時間後に自動削除されます
- ファイル名の形式: `report_{employeeId}_{yearMonth}.pdf`

## ログ

ログは標準出力に出力されます。本番環境では適切なログ管理システムに連携してください。

## トラブルシューティング

### よくある問題

1. **PDF生成に失敗する**
   - Spring Bootアプリケーションが起動していることを確認
   - 従業員IDと年月が正しいことを確認

2. **ファイルが見つからない**
   - ファイルが24時間以内に生成されたことを確認
   - tmpディレクトリの権限を確認

3. **通信エラー**
   - ネットワーク接続を確認
   - ファイアウォール設定を確認

## 開発

### コードの構造

```
fastapi_pdf_service/
├── main.py                 # FastAPIアプリケーション
├── models/                 # データモデル
│   ├── report_request.py
│   └── report_response.py
├── services/               # ビジネスロジック
│   ├── pdf_generator.py
│   └── file_manager.py
├── tests/                  # テスト
│   └── test_pdf_generation.py
├── requirements.txt        # 依存関係
└── README.md              # このファイル
```

### 新しい機能の追加

1. 新しいエンドポイントを `main.py` に追加
2. 必要に応じてモデルを `models/` に追加
3. ビジネスロジックを `services/` に追加
4. テストを `tests/` に追加
