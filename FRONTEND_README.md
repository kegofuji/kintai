# 勤怠管理システム フロントエンド

## 概要

要件定義書のワイヤーフレームに準拠したVanilla JS SPAフロントエンドです。Bootstrap 5.3.0を使用したレスポンシブデザインで、スマートフォンからデスクトップまで対応しています。

## 技術スタック

- **Vanilla JavaScript** - フレームワークを使わない純粋なJavaScript
- **Bootstrap 5.3.0** - レスポンシブUIフレームワーク
- **Font Awesome 6.0.0** - アイコンライブラリ
- **Fetch API** - HTTP通信
- **SPA (Single Page Application)** - ハッシュベースルーティング

## ファイル構成

```
src/main/resources/static/
├── index.html              # メインSPA画面
├── test.html               # テスト用ページ
├── app.js                  # メインアプリケーション
└── js/
    ├── utils/
    │   ├── fetchWithAuth.js # 認証付きFetch API
    │   └── router.js        # SPAルーティング
    └── screens/
        ├── login.js         # ログイン画面
        ├── dashboard.js     # ダッシュボード画面
        ├── history.js       # 勤怠履歴画面
        ├── vacation.js      # 有給申請画面
        ├── adjustment.js    # 打刻修正申請画面
        └── admin.js         # 管理者画面群
```

## 画面構成

### 一般ユーザー向け画面

1. **ログイン画面** (`/login`)
   - ユーザー名・パスワード入力
   - パスワード強度チェック機能
   - セッション管理

2. **ダッシュボード** (`/dashboard`)
   - 出勤・退勤打刻ボタン
   - 勤怠ステータス表示
   - 勤怠履歴一覧
   - 月末申請機能

3. **勤怠履歴** (`/history`)
   - 日別勤怠データ表示
   - 遅刻・早退・残業・深夜時間表示
   - 期間検索機能
   - 月末申請ボタン

4. **有給申請** (`/vacation`)
   - 残有給日数表示
   - 日付選択・理由入力
   - 申請送信機能

5. **打刻修正申請** (`/adjustment`)
   - 対象日選択
   - 修正打刻時刻入力
   - 理由入力・申請送信

### 管理者向け画面

6. **管理者ダッシュボード** (`/admin`)
   - 各管理機能へのリンク

7. **社員管理** (`/admin/employees`)
   - 社員一覧表示
   - 社員編集・退職処理

8. **勤怠管理** (`/admin/attendance`)
   - 勤怠データ検索・編集
   - 社員別・期間別検索

9. **申請承認** (`/admin/approvals`)
   - 未承認申請一覧
   - 承認・却下処理

10. **レポート出力** (`/admin/reports`)
    - PDFレポート生成
    - 社員別・期間別出力

11. **有給承認・付与調整** (`/admin/vacation-management`)
    - 有給申請管理
    - 有給日数調整

## API連携

### 認証API
- `POST /api/auth/login` - ログイン
- `GET /api/auth/session` - セッション確認
- `POST /api/auth/logout` - ログアウト

### 勤怠API
- `POST /api/attendance/clock-in` - 出勤打刻
- `POST /api/attendance/clock-out` - 退勤打刻
- `GET /api/attendance/history/{employeeId}` - 勤怠履歴取得
- `POST /api/attendance/monthly-submit` - 月末申請
- `GET /api/attendance/csrf-token` - CSRFトークン取得

### 有給API
- `POST /api/vacation/request` - 有給申請
- `GET /api/vacation/remaining/{employeeId}` - 残有給日数取得
- `GET /api/vacation/csrf-token` - CSRFトークン取得

### 管理者API
- `GET /api/admin/employees` - 社員一覧取得
- `GET /api/admin/attendance` - 勤怠データ検索
- `GET /api/admin/approvals/pending` - 未承認申請取得
- `POST /api/admin/approvals/approve` - 申請承認・却下
- `GET /api/admin/csrf-token` - CSRFトークン取得

### レポートAPI
- `POST /api/reports/generate` - PDFレポート生成

## 主要機能

### 認証・セッション管理
- `fetchWithAuth` クラスによる認証付きHTTP通信
- X-CSRF-TOKENの自動付与
- 401/403エラー時の自動ログイン画面遷移
- セッション管理（cookie + token）

### SPAルーティング
- ハッシュベースルーティング（`#/path`）
- 画面間のスムーズな遷移
- 管理者権限による画面制御

### レスポンシブデザイン
- Bootstrap 5.3.0によるモバイルファーストデザイン
- スマートフォン・タブレット・デスクトップ対応
- ナビゲーションバーの折りたたみ機能

### フォームバリデーション
- リアルタイムバリデーション
- パスワード強度チェック
- 日付・時刻の妥当性チェック

### エラーハンドリング
- 包括的なエラー処理
- ユーザーフレンドリーなエラーメッセージ
- モックデータによるフォールバック

## 使用方法

### 1. メインアプリケーション
```
http://localhost:8080/
```

### 2. テストページ
```
http://localhost:8080/test.html
```

### 3. ログイン情報
- **一般ユーザー**: `user1` / `pass`
- **管理者**: `admin` / `pass`

## テスト機能

テストページ（`test.html`）では以下のテストが可能です：

### ログインテスト
- 一般ユーザー・管理者でのログインテスト

### 画面遷移テスト
- 全画面への遷移テスト
- 管理者権限による画面制御テスト

### API接続テスト
- セッション確認
- 勤怠履歴取得
- 社員一覧取得
- CSRFトークン取得
- ログインAPI
- 出勤打刻API
- PDFレポートAPI

### 機能テスト
- 出勤・退勤打刻
- 有給申請
- PDF出力

### レスポンシブテスト
- モバイル・タブレット・デスクトップ表示

## 開発・デバッグ

### コンソールログ
- 詳細なログ出力でデバッグをサポート
- エラー情報の詳細表示

### モックデータ
- API未接続時でもモックデータで動作確認可能
- 開発時のテストデータ提供

### テスト結果表示
- リアルタイムでのテスト結果表示
- 成功・失敗の視覚的フィードバック

## セキュリティ

### CSRF対策
- 全POST/PUT/DELETEリクエストにCSRFトークン付与
- 複数コントローラーからのトークン取得対応

### 認証制御
- セッションベースの認証
- 管理者権限による画面・機能制御
- 自動ログアウト機能

### 入力検証
- クライアントサイドでの入力検証
- サーバーサイドAPIとの連携

## ブラウザ対応

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)

## ライセンス

このプロジェクトは内部使用を目的としています。
