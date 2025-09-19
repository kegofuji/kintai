#!/bin/bash

echo "=== Dev環境テスト (H2 in-memory) ==="
echo "H2データベースでアプリケーションを起動します..."

# 既存のプロセスを停止
pkill -f "spring-boot:run" || true

# devプロファイルでアプリケーションを起動
echo "mvn spring-boot:run -Dspring-boot.run.profiles=dev を実行中..."
mvn spring-boot:run -Dspring-boot.run.profiles=dev &
APP_PID=$!

# アプリケーションの起動を待機
echo "アプリケーションの起動を待機中..."
sleep 30

# ヘルスチェック
echo "ヘルスチェックを実行中..."
if curl -f http://localhost:8080/actuator/health > /dev/null 2>&1; then
    echo "✅ Dev環境 (H2) での起動が成功しました"
    echo "アプリケーションURL: http://localhost:8080"
    echo "H2コンソールURL: http://localhost:8080/h2-console"
    echo "プロセスID: $APP_PID"
    echo ""
    echo "アプリケーションを停止するには: kill $APP_PID"
else
    echo "❌ Dev環境での起動に失敗しました"
    kill $APP_PID 2>/dev/null || true
    exit 1
fi
