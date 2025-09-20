#!/bin/bash
set -e

echo "=== 勤怠管理システム API 結合テスト開始 ==="

BASE_URL="http://localhost:8080"
FASTAPI_URL="http://localhost:8081"
COOKIE_JAR="cookies.txt"

# 0. サーバーヘルスチェック
echo "[0] ヘルスチェック..."
curl -s ${BASE_URL}/api/attendance/health | grep "勤怠管理システム"
curl -s ${FASTAPI_URL}/health | grep "healthy"

# 1. ログイン (一般社員 user1/pass)
echo "[1] ログイン..."
curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"pass"}' \
  -c $COOKIE_JAR

# 2. 出勤打刻
echo "[2] 出勤打刻..."
curl -s -X POST ${BASE_URL}/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -b $COOKIE_JAR \
  -d '{"employeeId":6}'

# 3. 退勤打刻
echo "[3] 退勤打刻..."
curl -s -X POST ${BASE_URL}/api/attendance/clock-out \
  -H "Content-Type: application/json" \
  -b $COOKIE_JAR \
  -d '{"employeeId":6}'

# 4. 勤怠履歴確認
echo "[4] 勤怠履歴確認..."
curl -s "${BASE_URL}/api/attendance/history/6?year=2025&month=9" -b $COOKIE_JAR

# 5. 有給申請
echo "[5] 有給申請..."
curl -s -X POST ${BASE_URL}/api/vacation/request \
  -H "Content-Type: application/json" \
  -b $COOKIE_JAR \
  -d '{"employeeId":6,"startDate":"2025-09-25","endDate":"2025-09-25","reason":"私用"}'

# 6. 月末申請
echo "[6] 月末申請..."
curl -s -X POST ${BASE_URL}/api/attendance/monthly-submit \
  -H "Content-Type: application/json" \
  -b $COOKIE_JAR \
  -d '{"employeeId":6,"yearMonth":"2025-09"}'

# 7. 管理者ログイン
echo "[7] 管理者ログイン..."
curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"pass"}' \
  -c admin_cookies.txt

# 8. 管理者月末申請承認
echo "[8] 管理者月末申請承認..."
curl -s -X POST ${BASE_URL}/api/attendance/monthly-approve \
  -H "Content-Type: application/json" \
  -b admin_cookies.txt \
  -d '{"employeeId":6,"yearMonth":"2025-09"}'

# 9. 有給承認
echo "[9] 管理者による有給承認..."
curl -s -X POST ${BASE_URL}/api/admin/vacation/approve \
  -H "Content-Type: application/json" \
  -b $COOKIE_JAR \
  -d '{"vacationId":1,"approved":true}'

# 10. 月末承認
echo "[10] 管理者による月末承認..."
curl -s -X POST ${BASE_URL}/api/admin/attendance/approve \
  -H "Content-Type: application/json" \
  -b $COOKIE_JAR \
  -d '{"employeeId":6,"yearMonth":"2025-09"}'

# 11. PDF生成（Spring Boot → FastAPI）
echo "[11] PDF生成..."
curl -s -X POST ${BASE_URL}/api/reports/generate \
  -H "Content-Type: application/json" \
  -b $COOKIE_JAR \
  -d '{"employeeId":6,"yearMonth":"2025-09"}'

echo "=== API結合テスト完了 ==="
