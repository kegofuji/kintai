# 勤怠管理システム (Kintai Management System)

## 概要
Spring Bootを使用した出退勤打刻APIシステムです。従業員の出退勤時刻を記録し、遅刻・早退・残業・深夜勤務時間を自動計算します。

## 機能
- 出勤打刻API
- 退勤打刻API
- 遅刻・早退時間の自動計算
- 残業時間の自動計算
- 深夜勤務時間の自動計算
- 昼休憩時間の自動控除
- 重複打刻防止
- バリデーション機能
- **勤怠レポートPDF生成** (FastAPIマイクロサービス)
- **PDFファイルの自動削除** (24時間後)

## 技術スタック
- Java 17
- Spring Boot 3.2.0
- Spring Data JPA
- MySQL 8.0
- Flyway (データベースマイグレーション)
- Maven
- **FastAPI** (PDF生成マイクロサービス)
- **Python 3.13** (PDF生成)

## 時間計算仕様
- **所定勤務時間**: 09:00-18:00（8時間・480分）
- **昼休憩**: 12:00-13:00（60分）自動控除
- **深夜勤務**: 22:00-翌05:00
- **タイムゾーン**: Asia/Tokyo

## セットアップ

### 1. 前提条件
- Java 17以上
- MySQL 8.0以上
- Maven 3.6以上

### 2. データベース設定
```sql
CREATE DATABASE kintai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. アプリケーション設定
`src/main/resources/application.yml`でデータベース接続情報を設定してください。

### 4. アプリケーション起動

#### Spring Bootアプリケーション
```bash
# 依存関係のインストール
./mvnw clean install

# データベースマイグレーション実行
./mvnw flyway:migrate

# アプリケーション起動
./mvnw spring-boot:run
```

#### FastAPI PDFサービス
```bash
# FastAPIサービスディレクトリに移動
cd fastapi_pdf_service

# サービス起動
./start_service.sh
```

#### 統合テスト実行
```bash
# 両方のサービスが起動した後
./test_integration.sh
```

## API仕様

### 出勤打刻API
**POST** `/api/attendance/clock-in`

**リクエスト:**
```json
{
  "employeeId": 1
}
```

**レスポンス（成功）:**
```json
{
  "success": true,
  "message": "出勤打刻完了（5分遅刻）",
  "data": {
    "attendanceId": 123,
    "clockInTime": "2025-01-01T09:05:00",
    "lateMinutes": 5
  }
}
```

**レスポンス（エラー）:**
```json
{
  "success": false,
  "errorCode": "ALREADY_CLOCKED_IN",
  "message": "既に出勤打刻済みです"
}
```

### 退勤打刻API
**POST** `/api/attendance/clock-out`

**リクエスト:**
```json
{
  "employeeId": 1
}
```

**レスポンス（成功）:**
```json
{
  "success": true,
  "message": "退勤打刻完了（10分残業）",
  "data": {
    "attendanceId": 123,
    "clockInTime": "2025-01-01T09:00:00",
    "clockOutTime": "2025-01-01T18:10:00",
    "lateMinutes": 0,
    "earlyLeaveMinutes": 0,
    "overtimeMinutes": 10,
    "nightShiftMinutes": 0
  }
}
```

### 勤怠レポートPDF生成API
**POST** `/api/reports/generate`

**リクエスト:**
```json
{
  "employeeId": 2,
  "yearMonth": "2025-09"
}
```

**レスポンス（成功）:**
```json
{
  "url": "http://localhost:8081/reports/tmp/report_2_202509.pdf"
}
```

**レスポンス（エラー）:**
```json
{
  "message": "従業員データが見つかりません"
}
```

## エラーコード
- `ALREADY_CLOCKED_IN`: 既に出勤打刻済み
- `NOT_CLOCKED_IN`: 出勤打刻がされていない
- `FIXED_ATTENDANCE`: 確定済みの勤怠記録
- `RETIRED_EMPLOYEE`: 退職済みの従業員
- `EMPLOYEE_NOT_FOUND`: 従業員が見つからない
- `INVALID_REQUEST`: 無効なリクエスト

## テスト実行

### ユニットテスト
```bash
./mvnw test
```

### 特定のテストクラス実行
```bash
./mvnw test -Dtest=TimeCalculatorTest
./mvnw test -Dtest=AttendanceServiceTest
./mvnw test -Dtest=AttendanceControllerTest
```

## テスト手順

### 1. 出勤打刻テスト
```bash
curl -X POST http://localhost:8080/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -d '{"employeeId": 1}'
```

### 2. 重複出勤テスト
```bash
# 同日2回目の出勤
curl -X POST http://localhost:8080/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -d '{"employeeId": 1}'
```

### 3. 退勤打刻テスト
```bash
curl -X POST http://localhost:8080/api/attendance/clock-out \
  -H "Content-Type: application/json" \
  -d '{"employeeId": 1}'
```

### 4. 時間計算確認
```sql
SELECT attendance_date, clock_in_time, clock_out_time, 
       late_minutes, overtime_minutes, night_shift_minutes
FROM attendance_records 
WHERE employee_id = 1 AND attendance_date = CURDATE();
```

### 5. PDF生成テスト
```bash
# Spring Boot経由でPDF生成
curl -X POST http://localhost:8080/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"employeeId": 2, "yearMonth": "2025-09"}'

# 生成されたPDFをダウンロード
curl -O http://localhost:8081/reports/tmp/report_2_202509.pdf
```

## ロールバック手順（緊急時）

### 1. アプリケーション停止
```bash
./mvnw spring-boot:stop
```

### 2. ブランチ切り戻し
```bash
git reset --hard HEAD~1
```

### 3. データベース修正
```sql
DELETE FROM attendance_records WHERE attendance_date = CURDATE();
```

### 4. アプリケーション再起動
```bash
./mvnw spring-boot:run
```

### 5. 動作確認
```bash
curl http://localhost:8080/api/attendance/health
```

## トラブルシューティング

### よくあるエラーと対処法

1. **"Table 'attendance_records' doesn't exist"**
   - 解決法: `./mvnw flyway:migrate` を実行

2. **時刻計算エラー**
   - 解決法: `TimeCalculatorTest` でロジック確認

3. **バリデーションエラー**
   - 解決法: `AttendanceServiceTest` でケース確認

4. **データベース接続エラー**
   - 解決法: `application.yml` の接続情報を確認

## 操作マニュアル

### 一般社員用マニュアル

#### 1. ログイン方法
1. ブラウザでアプリケーションにアクセス
2. ログイン画面でユーザー名とパスワードを入力
   - テスト用アカウント: `user1` / `pass` (一般ユーザー)
   - 管理者アカウント: `admin` / `pass` (管理者)
3. 「ログイン」ボタンをクリック

#### 2. 出勤/退勤
1. ログイン後、メイン画面の「出勤・退勤」カードを確認
2. **出勤時**: 「出勤打刻」ボタンをクリック
   - 出勤時刻が記録され、遅刻の場合は自動計算されます
3. **退勤時**: 「退勤打刻」ボタンをクリック
   - 退勤時刻が記録され、残業時間が自動計算されます
4. 現在の出勤状況が「出勤中」「退勤済み」で表示されます

#### 3. 勤怠履歴の確認
1. メイン画面の「勤怠履歴」テーブルで過去の勤怠記録を確認
2. 「更新」ボタンで最新のデータを取得
3. 表示項目：
   - 日付
   - 出勤時刻
   - 退勤時刻
   - 勤務時間
   - ステータス（未出勤/出勤中/退勤済み）

#### 4. 有給申請
1. 「有給申請」カードの「有給申請」ボタンをクリック
2. 申請フォームに以下を入力：
   - 開始日（必須）
   - 終了日（必須）
   - 理由（必須）
3. 「申請」ボタンをクリックして申請を送信
4. 申請後は管理者による承認待ちとなります

#### 5. 月末申請
1. 「月末申請」カードで申請月を選択
2. 「月末申請」ボタンをクリック
3. 選択した月の勤怠データが申請されます
4. 申請後は管理者による承認が必要です

### 管理者用マニュアル

#### 1. 社員一覧表示・編集
1. 管理者権限でログイン後、「管理者機能」セクションが表示されます
2. 「社員一覧」ボタンをクリック
3. 全社員の情報が一覧表示されます：
   - 従業員ID
   - 従業員コード
   - 氏名
   - メールアドレス
   - 入社日
   - ステータス（在職/退職）

#### 2. 有給承認・付与調整
1. 「未承認申請」ボタンをクリック
2. 未承認の有給申請一覧が表示されます
3. 各申請に対して：
   - 「承認」ボタン：申請を承認
   - 「却下」ボタン：申請を却下
4. 承認/却下後、申請者は結果を確認できます

#### 3. 打刻修正承認
1. 社員からの打刻修正申請を確認
2. 修正内容を検証
3. 承認/却下の判断を行い、結果を通知

#### 4. 月末申請承認
1. 社員からの月末申請を確認
2. 勤怠データの整合性をチェック
3. 承認/却下の判断を行い、結果を通知

#### 5. レポート出力（PDF）
1. 「レポート出力」ボタンをクリック
2. 指定された従業員の勤怠レポートがPDF形式で生成されます
3. レポートには以下が含まれます：
   - 従業員情報
   - 月間勤怠データ
   - 出勤・退勤時刻
   - 勤務時間
   - 遅刻・早退・残業時間
   - 深夜勤務時間

### Railway デプロイ後のアクセス方法

#### 本番環境へのアクセス
1. **アプリケーションURL**: `https://<railway-app>.railway.app`
2. **ログイン画面**: `https://<railway-app>.railway.app/login`
3. **API エンドポイント**: `https://<railway-app>.railway.app/api/`

#### アクセス手順
1. 上記URLにブラウザでアクセス
2. ログイン画面が表示されます
3. 管理者権限でログインする場合は `admin` / `pass` を使用
4. 一般社員としてログインする場合は `user1` / `pass` を使用

#### 注意事項
- Railway環境では、データベースは自動的に設定されます
- PDF生成サービスも自動的に起動します
- 本番環境では適切な認証情報に変更してください

## ライセンス
このプロジェクトはMITライセンスの下で公開されています。
