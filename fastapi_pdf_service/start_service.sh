#!/bin/bash

# FastAPI PDF Service 起動スクリプト

echo "FastAPI PDF Service を起動しています..."

# 仮想環境の作成（存在しない場合）
if [ ! -d "venv" ]; then
    echo "仮想環境を作成しています..."
    python3 -m venv venv
fi

# 仮想環境をアクティベート
echo "仮想環境をアクティベートしています..."
source venv/bin/activate

# 依存関係をインストール
echo "依存関係をインストールしています..."
pip install -r requirements.txt

# 一時ディレクトリを作成
mkdir -p tmp

# FastAPIサービスを起動
echo "FastAPIサービスを起動しています..."
echo "URL: http://localhost:8081"
echo "API仕様書: http://localhost:8081/docs"
echo ""
echo "終了するには Ctrl+C を押してください"
echo ""

uvicorn main:app --host 0.0.0.0 --port 8081 --reload
