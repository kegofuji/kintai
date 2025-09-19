#!/bin/bash

# Spring Security設定のテストスクリプト
echo "=== Spring Security設定テスト ==="

# 色付き出力用の関数
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "\033[32m✓ $2\033[0m"
    else
        echo -e "\033[31m✗ $2\033[0m"
    fi
}

# devプロファイルでのテスト
echo ""
echo "--- devプロファイルテスト ---"
echo "アプリケーションをdevプロファイルで起動中..."

# devプロファイルでアプリケーションを起動（バックグラウンド）
mvn spring-boot:run -Dspring-boot.run.profiles=dev > /dev/null 2>&1 &
APP_PID=$!

# アプリケーション起動待機
echo "アプリケーション起動を待機中..."
sleep 10

# ヘルスチェック（認証なしでアクセス可能）
echo "ヘルスチェックエンドポイントテスト..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/attendance/health)
print_status $([ "$HEALTH_RESPONSE" = "200" ] && echo 0 || echo 1) "dev: /api/attendance/health → $HEALTH_RESPONSE (期待値: 200)"

# 管理者エンドポイント（認証なしでアクセス可能）
echo "管理者エンドポイントテスト..."
ADMIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/admin/employees)
print_status $([ "$ADMIN_RESPONSE" = "200" ] && echo 0 || echo 1) "dev: /api/admin/employees → $ADMIN_RESPONSE (期待値: 200)"

# アプリケーション停止
kill $APP_PID 2>/dev/null
sleep 3

echo ""
echo "--- prodプロファイルテスト ---"
echo "アプリケーションをprodプロファイルで起動中..."

# prodプロファイルでアプリケーションを起動（バックグラウンド）
mvn spring-boot:run -Dspring-boot.run.profiles=prod > /dev/null 2>&1 &
APP_PID=$!

# アプリケーション起動待機
echo "アプリケーション起動を待機中..."
sleep 10

# ヘルスチェック（認証必須）
echo "ヘルスチェックエンドポイントテスト..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/attendance/health)
print_status $([ "$HEALTH_RESPONSE" = "403" ] && echo 0 || echo 1) "prod: /api/attendance/health → $HEALTH_RESPONSE (期待値: 403)"

# 管理者エンドポイント（認証必須）
echo "管理者エンドポイントテスト..."
ADMIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/admin/employees)
print_status $([ "$ADMIN_RESPONSE" = "403" ] && echo 0 || echo 1) "prod: /api/admin/employees → $ADMIN_RESPONSE (期待値: 403)"

# ログインページ（認証なしでアクセス可能）
echo "ログインページテスト..."
LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/login)
print_status $([ "$LOGIN_RESPONSE" = "200" ] && echo 0 || echo 1) "prod: /login → $LOGIN_RESPONSE (期待値: 200)"

# アプリケーション停止
kill $APP_PID 2>/dev/null

echo ""
echo "=== テスト完了 ==="
echo ""
echo "手動テスト用のcurlコマンド:"
echo ""
echo "# devプロファイル（認証なし）"
echo "curl http://localhost:8080/api/attendance/health"
echo ""
echo "# prodプロファイル（認証必須）"
echo "curl http://localhost:8080/api/attendance/health"
echo ""
echo "# ログイン（prodプロファイル）"
echo "curl -X POST http://localhost:8080/api/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"username\":\"admin\",\"password\":\"admin123\"}'"
echo ""
echo "# FastAPI連携テスト（API Key認証）"
echo "curl -H 'X-API-Key: test-key' http://localhost:8080/api/pdf/generate"
