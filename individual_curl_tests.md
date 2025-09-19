# 勤怠修正申請API curlテスト例

## 基本テスト

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
