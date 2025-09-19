#!/bin/bash

# 月末申請フロー テストスクリプト
# 勤怠整合チェック機能の動作確認

BASE_URL="http://localhost:8080"
API_BASE="${BASE_URL}/api/attendance"

echo "=== 月末申請フロー テスト開始 ==="
echo ""

# 1. 正常データでの月末申請テスト
echo "1. 正常データでの月末申請テスト"
echo "POST ${API_BASE}/monthly-submit"
curl -X POST "${API_BASE}/monthly-submit" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": 1,
    "yearMonth": "2025-01"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""

# 2. 打刻漏れありでの月末申請テスト
echo "2. 打刻漏れありでの月末申請テスト"
echo "POST ${API_BASE}/monthly-submit"
curl -X POST "${API_BASE}/monthly-submit" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": 2,
    "yearMonth": "2025-01"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""

# 3. 未承認有給申請ありでの月末申請テスト
echo "3. 未承認有給申請ありでの月末申請テスト"
echo "POST ${API_BASE}/monthly-submit"
curl -X POST "${API_BASE}/monthly-submit" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": 3,
    "yearMonth": "2025-01"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""

# 4. 月末申請承認テスト
echo "4. 月末申請承認テスト"
echo "POST ${API_BASE}/monthly-approve"
curl -X POST "${API_BASE}/monthly-approve" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": 1,
    "yearMonth": "2025-01"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""

# 5. 申請されていない状態での承認テスト
echo "5. 申請されていない状態での承認テスト"
echo "POST ${API_BASE}/monthly-approve"
curl -X POST "${API_BASE}/monthly-approve" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": 2,
    "yearMonth": "2025-01"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s
echo ""

echo "=== 月末申請フロー テスト完了 ==="
