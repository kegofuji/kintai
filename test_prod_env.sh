#!/bin/bash

echo "=== Prod環境テスト (MySQL) ==="

# MySQLコンテナの起動確認
echo "MySQLコンテナの状態を確認中..."
if ! docker ps | grep -q kintai-mysql; then
    echo "MySQLコンテナを起動中..."
    docker-compose up -d mysql
    
    # MySQLの起動を待機
    echo "MySQLの起動を待機中..."
    for i in {1..30}; do
        if docker exec kintai-mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
            break
        fi
        sleep 2
    done
    
    if [ $? -ne 0 ]; then
        echo "❌ MySQLの起動に失敗しました"
        exit 1
    fi
    echo "✅ MySQLコンテナが起動しました"
else
    echo "✅ MySQLコンテナは既に起動しています"
fi

# 既存のアプリケーションプロセスを停止
pkill -f "spring-boot:run" || true

# prodプロファイルでアプリケーションを起動
echo "mvn spring-boot:run -Dspring-boot.run.profiles=prod を実行中..."
mvn spring-boot:run -Dspring-boot.run.profiles=prod &
APP_PID=$!

# アプリケーションの起動を待機
echo "アプリケーションの起動を待機中..."
sleep 30

# ヘルスチェック
echo "ヘルスチェックを実行中..."
if curl -f http://localhost:8080/actuator/health > /dev/null 2>&1; then
    echo "✅ Prod環境 (MySQL) での起動が成功しました"
    echo "アプリケーションURL: http://localhost:8080"
    echo "プロセスID: $APP_PID"
    echo ""
    echo "アプリケーションを停止するには: kill $APP_PID"
    echo "MySQLコンテナを停止するには: docker-compose down"
else
    echo "❌ Prod環境での起動に失敗しました"
    kill $APP_PID 2>/dev/null || true
    exit 1
fi
