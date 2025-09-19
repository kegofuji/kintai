# 勤怠管理システム テストガイド

## テスト環境セットアップ

### 1. データベース準備
```sql
-- MySQLにログイン
mysql -u root -p

-- データベース作成
CREATE DATABASE kintai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- データベース選択
USE kintai;
```

### 2. アプリケーション起動
```bash
# プロジェクトディレクトリに移動
cd /Users/keigofujita/kintai

# 依存関係インストール
./mvnw clean install

# データベースマイグレーション実行
./mvnw flyway:migrate

# アプリケーション起動
./mvnw spring-boot:run
```

## APIテスト手順

### テスト1: 正常な出勤打刻
```bash
# 出勤打刻（09:05 - 5分遅刻）
curl -X POST http://localhost:8080/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -d '{"employeeId": 1}' \
  | jq .

# 期待結果:
# {
#   "success": true,
#   "message": "出勤打刻完了（5分遅刻）",
#   "data": {
#     "attendanceId": 1,
#     "clockInTime": "2025-01-01T09:05:00",
#     "lateMinutes": 5
#   }
# }
```

### テスト2: 重複出勤エラー
```bash
# 同日2回目の出勤（エラー）
curl -X POST http://localhost:8080/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -d '{"employeeId": 1}' \
  | jq .

# 期待結果:
# {
#   "success": false,
#   "errorCode": "ALREADY_CLOCKED_IN",
#   "message": "既に出勤打刻済みです"
# }
```

### テスト3: 正常な退勤打刻
```bash
# 退勤打刻（18:10 - 10分残業）
curl -X POST http://localhost:8080/api/attendance/clock-out \
  -H "Content-Type: application/json" \
  -d '{"employeeId": 1}' \
  | jq .

# 期待結果:
# {
#   "success": true,
#   "message": "退勤打刻完了（10分残業）",
#   "data": {
#     "attendanceId": 1,
#     "clockInTime": "2025-01-01T09:05:00",
#     "clockOutTime": "2025-01-01T18:10:00",
#     "lateMinutes": 5,
#     "earlyLeaveMinutes": 0,
#     "overtimeMinutes": 10,
#     "nightShiftMinutes": 0
#   }
# }
```

### テスト4: 出勤前退勤エラー
```bash
# 出勤せずに退勤（エラー）
curl -X POST http://localhost:8080/api/attendance/clock-out \
  -H "Content-Type: application/json" \
  -d '{"employeeId": 2}' \
  | jq .

# 期待結果:
# {
#   "success": false,
#   "errorCode": "NOT_CLOCKED_IN",
#   "message": "出勤打刻がされていません"
# }
```

### テスト5: 存在しない従業員エラー
```bash
# 存在しない従業員IDで出勤
curl -X POST http://localhost:8080/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -d '{"employeeId": 999}' \
  | jq .

# 期待結果:
# {
#   "success": false,
#   "errorCode": "EMPLOYEE_NOT_FOUND",
#   "message": "従業員が見つかりません"
# }
```

### テスト6: 退職者エラー
```bash
# 退職済み従業員で出勤（employeeId: 4は退職済み）
curl -X POST http://localhost:8080/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -d '{"employeeId": 4}' \
  | jq .

# 期待結果:
# {
#   "success": false,
#   "errorCode": "RETIRED_EMPLOYEE",
#   "message": "退職済みの従業員です"
# }
```

### テスト7: バリデーションエラー
```bash
# 無効なリクエスト（employeeIdがnull）
curl -X POST http://localhost:8080/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -d '{"employeeId": null}' \
  | jq .

# 期待結果: 400 Bad Request
```

## 時間計算テストケース

### 遅刻時間計算テスト
```bash
# 09:00出勤（遅刻なし）
# 09:05出勤（5分遅刻）
# 10:30出勤（90分遅刻）
# 08:30出勤（早出、遅刻なし）
```

### 早退時間計算テスト
```bash
# 18:00退勤（早退なし）
# 17:30退勤（30分早退）
# 16:00退勤（120分早退）
# 19:00退勤（残業、早退なし）
```

### 残業時間計算テスト
```bash
# 480分勤務（残業なし）
# 540分勤務（60分残業）
# 420分勤務（残業なし）
# 600分勤務（120分残業）
```

### 深夜勤務時間計算テスト
```bash
# 09:00-18:00勤務（深夜なし）
# 09:00-23:00勤務（60分深夜）
# 21:00-02:00勤務（180分深夜）
# 23:00-06:00勤務（360分深夜）
```

### 昼休憩控除テスト
```bash
# 09:00-18:00勤務（60分控除）
# 13:00-18:00勤務（控除なし）
# 09:00-12:00勤務（控除なし）
# 11:00-14:00勤務（60分控除）
```

## データベース確認

### 勤怠記録確認
```sql
-- 今日の勤怠記録を確認
SELECT 
    ar.attendance_id,
    e.employee_code,
    e.last_name,
    e.first_name,
    ar.attendance_date,
    ar.clock_in_time,
    ar.clock_out_time,
    ar.late_minutes,
    ar.early_leave_minutes,
    ar.overtime_minutes,
    ar.night_shift_minutes,
    ar.attendance_status
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.employee_id
WHERE ar.attendance_date = CURDATE()
ORDER BY ar.clock_in_time;
```

### 従業員一覧確認
```sql
-- 従業員一覧を確認
SELECT 
    employee_id,
    employee_code,
    last_name,
    first_name,
    email,
    hire_date,
    retirement_date,
    is_active
FROM employees
ORDER BY employee_id;
```

## ユニットテスト実行

### 全テスト実行
```bash
./mvnw test
```

### 特定テストクラス実行
```bash
# TimeCalculatorテスト
./mvnw test -Dtest=TimeCalculatorTest

# AttendanceServiceテスト
./mvnw test -Dtest=AttendanceServiceTest

# AttendanceControllerテスト
./mvnw test -Dtest=AttendanceControllerTest
```

### テストカバレッジ確認
```bash
./mvnw test jacoco:report
```

## パフォーマンステスト

### 負荷テスト（例）
```bash
# Apache Benchを使用した負荷テスト
ab -n 100 -c 10 -H "Content-Type: application/json" \
  -p clock_in_request.json \
  http://localhost:8080/api/attendance/clock-in
```

## ログ確認

### アプリケーションログ確認
```bash
# リアルタイムログ確認
tail -f logs/application.log

# エラーログのみ確認
grep "ERROR" logs/application.log
```

### データベースログ確認
```sql
-- スロークエリログ確認
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';
```

## トラブルシューティング

### よくある問題と解決法

1. **アプリケーション起動エラー**
   - ポート8080が使用中: `lsof -i :8080` で確認
   - データベース接続エラー: `application.yml` の設定確認

2. **テスト失敗**
   - データベースが空: `./mvnw flyway:migrate` 実行
   - 時刻計算エラー: `TimeCalculatorTest` でロジック確認

3. **APIエラー**
   - バリデーションエラー: リクエスト形式確認
   - ビジネスロジックエラー: `AttendanceServiceTest` で確認

## テスト完了チェックリスト

- [ ] 出勤打刻API正常系テスト
- [ ] 退勤打刻API正常系テスト
- [ ] 重複打刻エラーテスト
- [ ] バリデーションエラーテスト
- [ ] 存在しない従業員エラーテスト
- [ ] 退職者エラーテスト
- [ ] 時間計算ロジックテスト
- [ ] データベース保存確認
- [ ] ユニットテスト全通過
- [ ] ログ出力確認
