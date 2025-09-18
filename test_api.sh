#!/bin/bash
set -e

echo "🚀 勤怠管理システム API 統合テスト開始"
echo "================================================"

# サーバーが起動しているかチェック
echo "1. サーバー接続確認"
echo "サーバーの起動を待機中..."

# 最大60秒待機
for i in {1..60}; do
    HEALTH_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:8080/actuator/health 2>/dev/null)
    HTTP_CODE="${HEALTH_RESPONSE: -3}"
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ サーバー接続確認完了"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "❌ エラー: サーバーが起動していません (HTTP: $HTTP_CODE)"
        echo "レスポンス: $HEALTH_RESPONSE"
        echo "先に ./mvnw spring-boot:run でサーバーを起動してください。"
        exit 1
    fi
    sleep 1
done

# クッキーファイルをクリア
rm -f cookies.txt

echo ""
echo "2. ログイン"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"pass"}' -c cookies.txt)

echo "ログインレスポンス: $LOGIN_RESPONSE"

# ログイン成功チェック
if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo "✅ ログイン成功"
else
    echo "❌ ログイン失敗"
    exit 1
fi

echo ""
echo "3. CSRFトークン取得"
CSRF_RESPONSE=$(curl -s -X GET http://localhost:8080/api/attendance/csrf-token -b cookies.txt)
echo "CSRFレスポンス: $CSRF_RESPONSE"

CSRF=$(echo "$CSRF_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$CSRF" ]; then
    echo "❌ CSRFトークン取得失敗"
    exit 1
fi
echo "✅ CSRFトークン取得完了: $CSRF"

echo ""
echo "4. テストデータクリア"
CLEAR_RESPONSE=$(curl -s -X POST http://localhost:8080/api/attendance/clear-test-data \
  -H "X-CSRF-TOKEN: $CSRF" \
  -b cookies.txt)

echo "データクリアレスポンス: $CLEAR_RESPONSE"

if echo "$CLEAR_RESPONSE" | grep -q '"success":true'; then
    echo "✅ テストデータクリア成功"
else
    echo "⚠️ テストデータクリア失敗（続行）"
fi

echo ""
echo "5. 出勤打刻"
CLOCK_IN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $CSRF" \
  -b cookies.txt \
  -d '{"employeeId":2}')

echo "出勤打刻レスポンス: $CLOCK_IN_RESPONSE"

if echo "$CLOCK_IN_RESPONSE" | grep -q '"success":true'; then
    echo "✅ 出勤打刻成功"
else
    echo "❌ 出勤打刻失敗"
    exit 1
fi

echo ""
echo "6. 退勤打刻"
CLOCK_OUT_RESPONSE=$(curl -s -X POST http://localhost:8080/api/attendance/clock-out \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $CSRF" \
  -b cookies.txt \
  -d '{"employeeId":2}')

echo "退勤打刻レスポンス: $CLOCK_OUT_RESPONSE"

if echo "$CLOCK_OUT_RESPONSE" | grep -q '"success":true'; then
    echo "✅ 退勤打刻成功"
else
    echo "❌ 退勤打刻失敗"
    exit 1
fi

echo ""
echo "7. 有給申請"
VACATION_RESPONSE=$(curl -s -X POST http://localhost:8080/api/vacation/request \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $CSRF" \
  -b cookies.txt \
  -d '{"employeeId":2,"startDate":"2025-09-20","endDate":"2025-09-20","reason":"有給休暇"}')

echo "有給申請レスポンス: $VACATION_RESPONSE"

if echo "$VACATION_RESPONSE" | grep -q '"success":true'; then
    echo "✅ 有給申請成功"
else
    echo "❌ 有給申請失敗"
    exit 1
fi

echo ""
echo "8. 月末申請"
MONTHLY_RESPONSE=$(curl -s -X POST http://localhost:8080/api/attendance/monthly-submit \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $CSRF" \
  -b cookies.txt \
  -d '{"employeeId":2,"yearMonth":"2025-09"}')

echo "月末申請レスポンス: $MONTHLY_RESPONSE"

if echo "$MONTHLY_RESPONSE" | grep -q '"success":true'; then
    echo "✅ 月末申請成功"
else
    echo "❌ 月末申請失敗"
    exit 1
fi

echo ""
echo "9. PDF生成"
PDF_RESPONSE=$(curl -s -X GET http://localhost:8080/api/attendance/report/2/2025-09 \
  -o report.pdf -b cookies.txt -H "X-CSRF-TOKEN: $CSRF" -w "%{http_code}")

echo "PDF生成レスポンス: $PDF_RESPONSE"

if [ -f "report.pdf" ] && [ -s "report.pdf" ]; then
    echo "✅ PDF生成成功 (ファイルサイズ: $(wc -c < report.pdf) bytes)"
else
    echo "❌ PDF生成失敗"
    exit 1
fi

echo ""
echo "10. ログアウト"
LOGOUT_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/logout \
  -H "X-CSRF-TOKEN: $CSRF" \
  -b cookies.txt)

echo "ログアウトレスポンス: $LOGOUT_RESPONSE"

if echo "$LOGOUT_RESPONSE" | grep -q '"success":true' || [ -z "$LOGOUT_RESPONSE" ]; then
    echo "✅ ログアウト成功"
else
    echo "❌ ログアウト失敗"
    exit 1
fi

echo ""
echo "================================================"
echo "🎉 APIテスト完了 - すべてのテストが成功しました！"
echo "================================================"

# クリーンアップ
rm -f cookies.txt
rm -f report.pdf
