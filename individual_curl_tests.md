# 勤怠管理システム API curlテスト例

## 基本テスト

### 1. ログイン（user1）
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "pass"
  }'
```

### 2. ログイン（admin）
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "pass"
  }'
```

## 勤怠管理API

### 3. 出勤打刻
```bash
curl -X POST http://localhost:8080/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: your-csrf-token" \
  -d '{
    "employeeId": 2
  }'
```

### 4. 退勤打刻
```bash
curl -X POST http://localhost:8080/api/attendance/clock-out \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: your-csrf-token" \
  -d '{
    "employeeId": 2
  }'
```

### 5. 月末申請
```bash
curl -X POST http://localhost:8080/api/attendance/monthly-submit \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: your-csrf-token" \
  -d '{
    "employeeId": 2,
    "year": 2025,
    "month": 9
  }'
```

## 有給申請API

### 6. 有給申請（未来日）
```bash
curl -X POST http://localhost:8080/api/vacation/apply \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: your-csrf-token" \
  -d '{
    "employeeId": 2,
    "startDate": "2025-09-25",
    "endDate": "2025-09-25",
    "reason": "私用"
  }'
```

### 7. 有給申請（過去日 - エラーテスト）
```bash
curl -X POST http://localhost:8080/api/vacation/apply \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: your-csrf-token" \
  -d '{
    "employeeId": 2,
    "startDate": "2025-08-15",
    "endDate": "2025-08-15",
    "reason": "私用"
  }'
```

## 打刻修正申請API

### 1. 修正申請作成
```bash
curl -X POST http://localhost:8080/api/attendance/adjustment \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": 2,
    "targetDate": "2025-09-15",
    "newClockIn": "2025-09-15T09:00:00",
    "newClockOut": "2025-09-15T18:00:00",
    "reason": "打刻忘れ"
  }'
```

### 2. 修正申請一覧取得（社員用）
```bash
curl -X GET http://localhost:8080/api/attendance/adjustment/2
```

## 管理者用API

### 3. 全修正申請一覧取得
```bash
curl -X GET http://localhost:8080/api/admin/attendance/adjustment
```

### 4. 修正申請承認
```bash
curl -X POST http://localhost:8080/api/admin/attendance/adjustment/approve/1
```

### 5. 修正申請却下
```bash
curl -X POST http://localhost:8080/api/admin/attendance/adjustment/reject/1
```

### 6. 状態別修正申請一覧取得
```bash
curl -X GET http://localhost:8080/api/admin/attendance/adjustment/status/PENDING
```

### 7. 承認待ち申請数取得
```bash
curl -X GET http://localhost:8080/api/admin/attendance/adjustment/pending-count
```

## PDF出力API

### 8. PDF生成（カレンダー形式）
```bash
curl -X POST http://localhost:8081/reports/pdf \
  -H "Authorization: Bearer test-key" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": 2,
    "yearMonth": "2025-09"
  }'
```

## 管理者API

### 9. 社員一覧取得
```bash
curl -X GET http://localhost:8080/api/admin/employees
```

### 10. 社員追加
```bash
curl -X POST http://localhost:8080/api/admin/employees \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: your-csrf-token" \
  -d '{
    "employeeCode": "E004",
    "firstName": "四郎",
    "lastName": "佐藤",
    "email": "sato@example.com",
    "hireDate": "2025-09-01"
  }'
```

### 11. 社員編集
```bash
curl -X PUT http://localhost:8080/api/admin/employees/2 \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: your-csrf-token" \
  -d '{
    "firstName": "花子",
    "lastName": "鈴木",
    "email": "suzuki.updated@example.com"
  }'
```

### 12. 社員退職処理
```bash
curl -X PUT http://localhost:8080/api/admin/employees/2/status \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: your-csrf-token" \
  -d '{
    "isActive": false
  }'
```

## エラーテスト

### 8. 未来日指定エラー
```bash
curl -X POST http://localhost:8080/api/attendance/adjustment \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": 2,
    "targetDate": "2025-12-31",
    "newClockIn": "2025-12-31T09:00:00",
    "newClockOut": "2025-12-31T18:00:00",
    "reason": "未来日のテスト"
  }'
```

### 9. 時間順序エラー
```bash
curl -X POST http://localhost:8080/api/attendance/adjustment \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": 2,
    "targetDate": "2025-09-14",
    "newClockIn": "2025-09-14T18:00:00",
    "newClockOut": "2025-09-14T09:00:00",
    "reason": "時間順序エラーテスト"
  }'
```

### 10. バリデーションエラー（理由が空）
```bash
curl -X POST http://localhost:8080/api/attendance/adjustment \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": 2,
    "targetDate": "2025-09-14",
    "newClockIn": "2025-09-14T09:00:00",
    "newClockOut": "2025-09-14T18:00:00",
    "reason": ""
  }'
```

## 期待されるレスポンス

### 成功レスポンス例
```json
{
  "success": true,
  "message": "修正申請が正常に作成されました",
  "adjustmentRequestId": 1,
  "status": "PENDING",
  "createdAt": "2025-09-19T09:41:07.059062"
}
```

### エラーレスポンス例
```json
{
  "success": false,
  "errorCode": "INVALID_DATE",
  "message": "対象日は過去日または当日のみ指定可能です"
}
```
