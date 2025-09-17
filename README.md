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

## 技術スタック
- Java 17
- Spring Boot 3.2.0
- Spring Data JPA
- MySQL 8.0
- Flyway (データベースマイグレーション)
- Maven

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
```bash
# 依存関係のインストール
./mvnw clean install

# データベースマイグレーション実行
./mvnw flyway:migrate

# アプリケーション起動
./mvnw spring-boot:run
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

## ライセンス
このプロジェクトはMITライセンスの下で公開されています。
