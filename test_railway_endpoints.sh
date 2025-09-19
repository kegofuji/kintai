#!/bin/bash

# Railway デプロイ後のエンドポイントテストスクリプト
# 使用方法: ./test_railway_endpoints.sh <railway-app-url>

if [ $# -eq 0 ]; then
    echo "使用方法: $0 <railway-app-url>"
    echo "例: $0 https://kintai-production.railway.app"
    exit 1
fi

RAILWAY_URL=$1
echo "Railway アプリケーションのエンドポイントテストを開始します: $RAILWAY_URL"
echo "=================================================="

# 1. 環境変数確認（Railway CLIが利用可能な場合）
echo "1. Railway 環境変数の確認..."
if command -v railway &> /dev/null; then
    echo "Railway CLI で環境変数を確認中..."
    railway variables
else
    echo "Railway CLI が利用できません。ダッシュボードで環境変数を確認してください。"
fi

echo ""

# 2. Spring Boot API ヘルスチェック
echo "2. Spring Boot API ヘルスチェック..."
echo "URL: $RAILWAY_URL/api/attendance/health"
API_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$RAILWAY_URL/api/attendance/health")
HTTP_CODE=$(echo "$API_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$API_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Spring Boot API: OK ($HTTP_CODE)"
    echo "   レスポンス: $RESPONSE_BODY"
else
    echo "❌ Spring Boot API: NG ($HTTP_CODE)"
    echo "   レスポンス: $RESPONSE_BODY"
fi

echo ""

# 3. FastAPI PDF サービスのヘルスチェック
echo "3. FastAPI PDF サービスのヘルスチェック..."
echo "URL: $RAILWAY_URL:8081/health"
PDF_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$RAILWAY_URL:8081/health")
PDF_HTTP_CODE=$(echo "$PDF_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
PDF_RESPONSE_BODY=$(echo "$PDF_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$PDF_HTTP_CODE" = "200" ]; then
    echo "✅ FastAPI PDF サービス: OK ($PDF_HTTP_CODE)"
    echo "   レスポンス: $PDF_RESPONSE_BODY"
else
    echo "❌ FastAPI PDF サービス: NG ($PDF_HTTP_CODE)"
    echo "   レスポンス: $PDF_RESPONSE_BODY"
fi

echo ""

# 4. PDF 生成エンドポイントの確認
echo "4. PDF 生成エンドポイントの確認..."
echo "URL: $RAILWAY_URL:8081/reports/pdf"
PDF_GEN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$RAILWAY_URL:8081/reports/pdf" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer railway-production-key" \
    -d '{"employeeId": 2, "yearMonth": "2025-09"}')
PDF_GEN_HTTP_CODE=$(echo "$PDF_GEN_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
PDF_GEN_RESPONSE_BODY=$(echo "$PDF_GEN_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$PDF_GEN_HTTP_CODE" = "200" ]; then
    echo "✅ PDF 生成エンドポイント: OK ($PDF_GEN_HTTP_CODE)"
    echo "   レスポンス: $PDF_GEN_RESPONSE_BODY"
else
    echo "❌ PDF 生成エンドポイント: NG ($PDF_GEN_HTTP_CODE)"
    echo "   レスポンス: $PDF_GEN_RESPONSE_BODY"
fi

echo ""

# 5. SPA ログインページの確認
echo "5. SPA ログインページの確認..."
echo "URL: $RAILWAY_URL/login"
SPA_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$RAILWAY_URL/login")
SPA_HTTP_CODE=$(echo "$SPA_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)

if [ "$SPA_HTTP_CODE" = "200" ]; then
    echo "✅ SPA ログインページ: OK ($SPA_HTTP_CODE)"
else
    echo "❌ SPA ログインページ: NG ($SPA_HTTP_CODE)"
fi

echo ""
echo "=================================================="
echo "テスト完了"
