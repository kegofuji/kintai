#!/bin/bash

# Railway デプロイ後の動作確認スクリプト
# 使用方法: ./test_railway_deployment.sh <railway-app-url>

if [ $# -eq 0 ]; then
    echo "使用方法: $0 <railway-app-url>"
    echo "例: $0 https://kintai-production.railway.app"
    exit 1
fi

RAILWAY_URL=$1
echo "Railway アプリケーションの動作確認を開始します: $RAILWAY_URL"

# 1. SPA ログインページの確認
echo "1. SPA ログインページの確認..."
LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/login")
if [ "$LOGIN_RESPONSE" = "200" ]; then
    echo "✅ SPA ログインページ: OK ($LOGIN_RESPONSE)"
else
    echo "❌ SPA ログインページ: NG ($LOGIN_RESPONSE)"
fi

# 2. Spring Boot API ヘルスチェック
echo "2. Spring Boot API ヘルスチェック..."
API_RESPONSE=$(curl -s "$RAILWAY_URL/api/attendance/health")
if [[ "$API_RESPONSE" == *"正常に動作しています"* ]]; then
    echo "✅ Spring Boot API: OK"
    echo "   レスポンス: $API_RESPONSE"
else
    echo "❌ Spring Boot API: NG"
    echo "   レスポンス: $API_RESPONSE"
fi

# 3. FastAPI PDF サービスのヘルスチェック
echo "3. FastAPI PDF サービスのヘルスチェック..."
PDF_RESPONSE=$(curl -s "$RAILWAY_URL:8081/health")
if [[ "$PDF_RESPONSE" == *"healthy"* ]]; then
    echo "✅ FastAPI PDF サービス: OK"
    echo "   レスポンス: $PDF_RESPONSE"
else
    echo "❌ FastAPI PDF サービス: NG"
    echo "   レスポンス: $PDF_RESPONSE"
fi

# 4. PDF 生成エンドポイントの確認
echo "4. PDF 生成エンドポイントの確認..."
PDF_GEN_RESPONSE=$(curl -s -X POST "$RAILWAY_URL:8081/reports/pdf" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer railway-production-key" \
    -d '{"employeeId": 1, "yearMonth": "2024-01"}')
if [[ "$PDF_GEN_RESPONSE" == *"url"* ]]; then
    echo "✅ PDF 生成エンドポイント: OK"
    echo "   レスポンス: $PDF_GEN_RESPONSE"
else
    echo "❌ PDF 生成エンドポイント: NG"
    echo "   レスポンス: $PDF_GEN_RESPONSE"
fi

echo "動作確認完了"
