#!/bin/bash

# 勤怠修正申請API curlテスト例

echo "=== 勤怠修正申請API テスト ==="

# 1. 申請作成（社員ユーザーで実行）
echo "1. 修正申請作成テスト"
curl -X POST http://localhost:8080/api/attendance/adjustment \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": 2,
    "targetDate": "2025-09-15",
    "newClockIn": "2025-09-15T09:00:00",
    "newClockOut": "2025-09-15T18:00:00",
    "reason": "打刻忘れ"
  }' | jq '.'

echo -e "\n"

# 2. 申請作成（当日の過去日）
echo "2. 当日の修正申請作成テスト"
curl -X POST http://localhost:8080/api/attendance/adjustment \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": 2,
    "targetDate": "'$(date +%Y-%m-%d)'",
    "newClockIn": "'$(date +%Y-%m-%d)'T09:00:00",
    "newClockOut": "'$(date +%Y-%m-%d)'T18:00:00",
    "reason": "打刻ミス"
  }' | jq '.'

echo -e "\n"

# 3. 申請一覧取得
echo "3. 修正申請一覧取得テスト"
curl -X GET http://localhost:8080/api/attendance/adjustment/2 | jq '.'

echo -e "\n"

# 4. 管理者用 - 全申請一覧取得
echo "4. 管理者用 - 全修正申請一覧取得テスト"
curl -X GET http://localhost:8080/api/admin/attendance/adjustment | jq '.'

echo -e "\n"

# 5. 管理者用 - 承認待ち申請数取得
echo "5. 管理者用 - 承認待ち申請数取得テスト"
curl -X GET http://localhost:8080/api/admin/attendance/adjustment/pending-count | jq '.'

echo -e "\n"

# 6. 管理者用 - 状態別申請一覧取得（PENDING）
echo "6. 管理者用 - 状態別申請一覧取得テスト（PENDING）"
curl -X GET http://localhost:8080/api/admin/attendance/adjustment/status/PENDING | jq '.'

echo -e "\n"

# 7. 管理者用 - 修正申請承認（申請ID=1を想定）
echo "7. 管理者用 - 修正申請承認テスト"
curl -X POST http://localhost:8080/api/admin/attendance/adjustment/approve/1 | jq '.'

echo -e "\n"

# 8. 管理者用 - 修正申請却下（申請ID=2を想定）
echo "8. 管理者用 - 修正申請却下テスト"
curl -X POST http://localhost:8080/api/admin/attendance/adjustment/reject/2 | jq '.'

echo -e "\n"

# 9. エラーテスト - 未来日指定
echo "9. エラーテスト - 未来日指定"
curl -X POST http://localhost:8080/api/attendance/adjustment \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": 2,
    "targetDate": "2025-12-31",
    "newClockIn": "2025-12-31T09:00:00",
    "newClockOut": "2025-12-31T18:00:00",
    "reason": "未来日のテスト"
  }' | jq '.'

echo -e "\n"

# 10. エラーテスト - 出勤時間が退勤時間より後
echo "10. エラーテスト - 出勤時間が退勤時間より後"
curl -X POST http://localhost:8080/api/attendance/adjustment \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": 2,
    "targetDate": "2025-09-14",
    "newClockIn": "2025-09-14T18:00:00",
    "newClockOut": "2025-09-14T09:00:00",
    "reason": "時間順序エラーテスト"
  }' | jq '.'

echo -e "\n"

echo "=== テスト完了 ==="
