#!/bin/bash

echo "=== MySQL Flywayマイグレーションテスト ==="

# MySQLコンテナの起動
echo "MySQLコンテナを起動中..."
docker-compose up -d mysql

# MySQLの起動を待機
echo "MySQLの起動を待機中..."
for i in {1..60}; do
    if docker exec kintai-mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
        break
    fi
    sleep 3
done

if ! docker exec kintai-mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
    echo "❌ MySQLの起動に失敗しました"
    exit 1
fi

echo "✅ MySQLコンテナが起動しました"

# データベースの存在確認
echo "データベースの存在を確認中..."
if docker exec kintai-mysql mysql -u root -proot -e "USE kintai;" 2>/dev/null; then
    echo "✅ kintaiデータベースが存在します"
else
    echo "❌ kintaiデータベースが存在しません"
    exit 1
fi

# Flywayマイグレーションの実行
echo "Flywayマイグレーションを実行中..."
mvn flyway:migrate -Dflyway.url=jdbc:mysql://localhost:3306/kintai -Dflyway.user=root -Dflyway.password=root

if [ $? -eq 0 ]; then
    echo "✅ Flywayマイグレーションが成功しました"
    
    # テーブルの存在確認
    echo "テーブルの存在を確認中..."
    TABLES=$(docker exec kintai-mysql mysql -u root -proot -e "USE kintai; SHOW TABLES;" 2>/dev/null | grep -v "Tables_in_kintai")
    
    if [ -n "$TABLES" ]; then
        echo "✅ 以下のテーブルが作成されました:"
        echo "$TABLES"
    else
        echo "❌ テーブルが作成されていません"
        exit 1
    fi
else
    echo "❌ Flywayマイグレーションに失敗しました"
    exit 1
fi

echo ""
echo "=== テスト完了 ==="
echo "MySQLコンテナを停止するには: docker-compose down"
