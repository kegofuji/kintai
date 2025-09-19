#!/bin/bash

echo "=== prodプロファイル認証テスト ==="

# 1. 認証なしでのアクセステスト（403エラーが期待値）
echo ""
echo "1. 認証なしでのアクセステスト:"
echo "curl http://localhost:8080/api/attendance/health"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/attendance/health)
if [ "$HEALTH_RESPONSE" = "403" ]; then
    echo "✅ 期待通り: 403 Forbidden (認証が必要)"
else
    echo "❌ 予期しない結果: $HEALTH_RESPONSE"
fi

# 2. ログインテスト
echo ""
echo "2. ログインテスト:"
echo "curl -X POST http://localhost:8080/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"pass\"}'"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"pass"}' \
  -w "%{http_code}")

if [[ "$LOGIN_RESPONSE" == *"200" ]]; then
    echo "✅ ログイン成功"
    
    # セッションCookieを抽出
    COOKIE=$(curl -s -X POST http://localhost:8080/api/auth/login \
      -H 'Content-Type: application/json' \
      -d '{"username":"admin","password":"pass"}' \
      -c - | grep JSESSIONID | awk '{print $7}')
    
    # 3. 認証後のアクセステスト
    echo ""
    echo "3. 認証後のアクセステスト:"
    echo "curl -H 'Cookie: JSESSIONID=$COOKIE' http://localhost:8080/api/attendance/health"
    AUTH_HEALTH_RESPONSE=$(curl -s -H "Cookie: JSESSIONID=$COOKIE" \
      -o /dev/null -w "%{http_code}" http://localhost:8080/api/attendance/health)
    
    if [ "$AUTH_HEALTH_RESPONSE" = "200" ]; then
        echo "✅ 認証後アクセス成功: 200 OK"
    else
        echo "❌ 認証後アクセス失敗: $AUTH_HEALTH_RESPONSE"
    fi
    
else
    echo "❌ ログイン失敗: $LOGIN_RESPONSE"
fi

# 4. ログインページアクセステスト
echo ""
echo "4. ログインページアクセステスト:"
LOGIN_PAGE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/login)
if [ "$LOGIN_PAGE_RESPONSE" = "200" ]; then
    echo "✅ ログインページアクセス成功: 200 OK"
else
    echo "❌ ログインページアクセス失敗: $LOGIN_PAGE_RESPONSE"
fi

# 5. 管理者エンドポイントテスト（認証なし）
echo ""
echo "5. 管理者エンドポイントテスト（認証なし）:"
ADMIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/admin/employees)
if [ "$ADMIN_RESPONSE" = "403" ]; then
    echo "✅ 管理者エンドポイント保護: 403 Forbidden"
else
    echo "❌ 予期しない結果: $ADMIN_RESPONSE"
fi

echo ""
echo "=== テスト完了 ==="
