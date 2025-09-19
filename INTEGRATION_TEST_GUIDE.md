# 勤怠管理システム 結合テストガイド

## 概要

本ドキュメントは、勤怠管理システム（Spring Boot + FastAPI + Vanilla JS SPA）の結合テストについて説明します。

## アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vanilla JS    │    │   Spring Boot   │    │    FastAPI      │
│   SPA           │◄──►│   (Port 8080)   │◄──►│   (Port 8081)   │
│   (Port 8080)   │    │                 │    │   PDF Service   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## テスト構成

### 1. cURL API統合テスト (`test_integration.sh`)

**目的**: API機能の結合テスト

**対象フロー**:
- ✅ 正常系
  - ログイン (一般社員 user1/pass)
  - 出勤打刻 → ステータス更新
  - 退勤打刻 → 履歴反映
  - 勤怠履歴表示
  - 月末申請 → 「申請済」ステータス
  - 有給申請（翌日分） → 残日数減少
  - 管理者ログイン (admin/pass)
  - 管理者が有給申請を承認
  - PDF生成 → ファイルダウンロード

- ❌ 異常系
  - ログイン失敗（パスワード間違い） → 401エラー
  - 出勤済みで再度出勤打刻 → エラー
  - 出勤なしで退勤打刻 → エラー
  - 認証なしでAPI呼び出し → 403 Forbidden

**実行方法**:
```bash
./test_integration.sh
```

### 2. Playwright UI統合テスト (`test_ui.spec.js`)

**目的**: フロントエンドSPAルーティングテスト

**対象フロー**:
- 画面遷移テスト
  - `/login` → `/dashboard` → `/history` → `/vacation` → `/adjustment`
  - `/admin` → `/admin/employees` → `/admin/reports`
- UI操作テスト
  - ログイン・ログアウト
  - 出勤・退勤打刻
  - 有給申請フォーム
  - 月末申請
  - 管理者機能
- レスポンシブデザインテスト
  - モバイル・タブレット・デスクトップ表示
- エラーハンドリングテスト

**実行方法**:
```bash
npx playwright test test_ui.spec.js
```

### 3. pytest統合テスト (`test_pdf_integration.py`)

**目的**: PDF生成と内容検証

**対象フロー**:
- サーバーヘルスチェック
- 認証機能テスト
- 勤怠APIテスト
- 有給申請APIテスト
- 管理者APIテスト
- PDF生成テスト
  - FastAPI直接PDF生成
  - Spring Boot経由PDF生成
  - PDF内容検証（マジックナンバー、構造確認）
  - PDFファイル名フォーマット確認
- エラーハンドリングテスト
- 統合フローテスト

**実行方法**:
```bash
python3 -m pytest test_pdf_integration.py -v
```

## 実行前準備

### 1. 依存関係インストール

```bash
# macOS
brew install jq python3
pip install pytest requests

# Ubuntu
sudo apt-get install jq python3 python3-pip
pip3 install pytest requests

# Playwright
npm install -g @playwright/test
npx playwright install
```

### 2. サーバー起動

```bash
# Spring Bootサーバー起動
mvn spring-boot:run

# FastAPIサーバー起動
cd fastapi_pdf_service
python -m uvicorn main:app --host 0.0.0.0 --port 8081
```

### 3. テストデータ準備

```sql
-- テストユーザー作成
INSERT INTO user_accounts (username, password, role, employee_id) VALUES
('user1', 'pass', 'USER', 1),
('admin', 'pass', 'ADMIN', 2);

-- テスト従業員データ
INSERT INTO employees (employee_id, employee_code, first_name, last_name, email, hire_date, is_active) VALUES
(1, 'E001', '太郎', '山田', 'yamada@example.com', '2024-01-01', true),
(2, 'E002', '花子', '鈴木', 'suzuki@example.com', '2024-01-01', true);
```

## 全テスト実行

### 自動実行

```bash
# 全テスト実行
./run_all_tests.sh

# 個別テスト実行
./run_all_tests.sh --curl-only      # cURL APIテストのみ
./run_all_tests.sh --pytest-only    # pytestテストのみ
./run_all_tests.sh --playwright-only # Playwrightテストのみ
```

### 手動実行

```bash
# 1. cURL API統合テスト
./test_integration.sh

# 2. pytest統合テスト
python3 -m pytest test_pdf_integration.py -v --tb=short

# 3. Playwright UIテスト
npx playwright test test_ui.spec.js --headed=false
```

## テスト結果確認

### 1. cURL APIテスト結果

```
[INFO] 勤怠管理システム結合テスト開始
==========================================
[SUCCESS] Spring Bootサーバー (8080) が起動中
[SUCCESS] FastAPIサーバー (8081) が起動中
[SUCCESS] 全サーバーが正常に起動中
[INFO] 一般ユーザーテスト開始...
[SUCCESS] ログイン成功: user1
[SUCCESS] 出勤打刻成功
[SUCCESS] 退勤打刻成功
...
==========================================
[INFO] テスト結果サマリー
総テスト数: 15
成功: 15
失敗: 0
[SUCCESS] 全テストが成功しました！
```

### 2. pytestテスト結果

```
test_pdf_integration.py::TestServerHealth::test_spring_boot_health PASSED
test_pdf_integration.py::TestServerHealth::test_fastapi_health PASSED
test_pdf_integration.py::TestAuthentication::test_successful_login PASSED
...
============================== 25 passed in 45.67s ==============================
```

### 3. Playwrightテスト結果

```
Running 25 tests using 5 workers
  25 passed (1m 23.4s)

To open last HTML report run:
  npx playwright show-report
```

## 検証観点

### 1. APIレスポンス検証

- **ステータスコード**: 200, 400, 401, 403, 404, 500
- **JSON構造**: success, message, data フィールド
- **エラーメッセージ**: 適切な日本語メッセージ

### 2. データベース更新検証

- **有給残日数**: 申請承認後の減少
- **submission_status**: 月末申請後の状態変更
- **fixed_flag**: 管理者承認後の固定化

### 3. フロントエンド検証

- **画面遷移**: ルーティングの正常動作
- **ボタン操作**: クリックイベントの反応
- **フォーム送信**: バリデーションとエラー表示
- **レスポンシブ表示**: 各デバイスサイズでの表示

### 4. PDF生成検証

- **ファイル生成**: PDFファイルの正常作成
- **内容検証**: ヘッダー、社員名、年月、勤怠合計
- **ダウンロード**: ブラウザからの正常ダウンロード
- **ファイル形式**: PDFマジックナンバー確認

## トラブルシューティング

### よくある問題

1. **サーバー接続エラー**
   ```bash
   # サーバー起動確認
   curl http://localhost:8080/api/attendance/health
   curl http://localhost:8081/health
   ```

2. **認証エラー**
   ```bash
   # セッションクリア
   rm -f cookies.txt
   ```

3. **依存関係エラー**
   ```bash
   # 不足パッケージ確認
   which jq python3 npx
   python3 -c "import pytest, requests"
   ```

4. **Playwrightエラー**
   ```bash
   # ブラウザ再インストール
   npx playwright install
   ```

### ログ確認

```bash
# Spring Bootログ
tail -f server.log

# FastAPIログ
cd fastapi_pdf_service
tail -f app.log
```

## 継続的インテグレーション

### GitHub Actions設定例

```yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          java-version: '17'
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y jq
          pip install pytest requests
          npm install -g @playwright/test
          npx playwright install
      - name: Start servers
        run: |
          mvn spring-boot:run &
          cd fastapi_pdf_service && python -m uvicorn main:app --port 8081 &
          sleep 30
      - name: Run tests
        run: ./run_all_tests.sh
```

## まとめ

本結合テストスイートにより、以下を包括的に検証できます：

- ✅ **API機能**: 全エンドポイントの正常動作
- ✅ **UI機能**: フロントエンドSPAの完全なユーザーフロー
- ✅ **PDF生成**: マイクロサービス連携とファイル生成
- ✅ **エラーハンドリング**: 異常系の適切な処理
- ✅ **セキュリティ**: 認証・認可の正常動作
- ✅ **パフォーマンス**: レスポンス時間とメモリ使用量

これらのテストを定期的に実行することで、システムの品質と安定性を継続的に保証できます。