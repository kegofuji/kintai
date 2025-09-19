#!/usr/bin/env python3
"""
勤怠管理システム テストデータ管理スクリプト
用途: テスト実行前後のデータベースセットアップ・クリーンアップ

使用方法:
  python test_data_manager.py setup    # テストデータセットアップ
  python test_data_manager.py cleanup  # テストデータクリーンアップ
  python test_data_manager.py status   # テストデータ状態確認
"""

import sys
import os
import argparse
import subprocess
import time
import requests
from pathlib import Path

# 設定
SPRING_BOOT_URL = "http://localhost:8080"
FASTAPI_URL = "http://localhost:8081"
SQL_DIR = Path(__file__).parent
SETUP_SQL = SQL_DIR / "setup_test_data.sql"
CLEANUP_SQL = SQL_DIR / "cleanup_test_data.sql"

class TestDataManager:
    """テストデータ管理クラス"""
    
    def __init__(self):
        self.spring_session = requests.Session()
        self.fastapi_session = requests.Session()
    
    def wait_for_services(self, timeout=60):
        """サービスが起動するまで待機"""
        print("サービス起動確認中...")
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                # Spring Boot ヘルスチェック
                spring_response = requests.get(f"{SPRING_BOOT_URL}/api/attendance/health", timeout=5)
                # FastAPI ヘルスチェック
                fastapi_response = requests.get(f"{FASTAPI_URL}/health", timeout=5)
                
                if spring_response.status_code == 200 and fastapi_response.status_code == 200:
                    print("✓ すべてのサービスが起動しています")
                    return True
            except requests.exceptions.RequestException:
                pass
            
            print(".", end="", flush=True)
            time.sleep(1)
        
        print(f"\n✗ サービス起動タイムアウト ({timeout}秒)")
        return False
    
    def execute_sql_file(self, sql_file):
        """SQLファイルを実行"""
        if not sql_file.exists():
            print(f"✗ SQLファイルが見つかりません: {sql_file}")
            return False
        
        try:
            # H2コンソール経由でSQLを実行
            # 実際の環境では適切なデータベース接続方法を使用
            print(f"SQLファイル実行中: {sql_file.name}")
            
            # ここではSpring Bootのテストエンドポイントを使用
            with open(sql_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            # SQL実行リクエスト
            response = self.spring_session.post(
                f"{SPRING_BOOT_URL}/api/test/data/init",
                json={"sql": sql_content},
                timeout=30
            )
            
            if response.status_code == 200:
                print(f"✓ SQLファイル実行完了: {sql_file.name}")
                return True
            else:
                print(f"✗ SQLファイル実行失敗: {response.status_code}")
                print(f"  エラー: {response.text}")
                return False
                
        except Exception as e:
            print(f"✗ SQLファイル実行エラー: {e}")
            return False
    
    def setup_test_data(self):
        """テストデータセットアップ"""
        print("=== テストデータセットアップ開始 ===")
        
        if not self.wait_for_services():
            return False
        
        # 既存データのクリーンアップ
        print("既存テストデータのクリーンアップ中...")
        self.execute_sql_file(CLEANUP_SQL)
        
        # テストデータのセットアップ
        print("テストデータのセットアップ中...")
        success = self.execute_sql_file(SETUP_SQL)
        
        if success:
            print("✓ テストデータセットアップ完了")
            self.check_test_data_status()
        else:
            print("✗ テストデータセットアップ失敗")
        
        return success
    
    def cleanup_test_data(self):
        """テストデータクリーンアップ"""
        print("=== テストデータクリーンアップ開始 ===")
        
        if not self.wait_for_services():
            return False
        
        success = self.execute_sql_file(CLEANUP_SQL)
        
        if success:
            print("✓ テストデータクリーンアップ完了")
            self.check_test_data_status()
        else:
            print("✗ テストデータクリーンアップ失敗")
        
        return success
    
    def check_test_data_status(self):
        """テストデータ状態確認"""
        print("\n=== テストデータ状態確認 ===")
        
        try:
            # テストデータの存在確認
            response = self.spring_session.get(
                f"{SPRING_BOOT_URL}/api/test/employees/1",
                timeout=10
            )
            
            if response.status_code == 200:
                print("✓ テスト従業員データ: 存在")
            else:
                print("✗ テスト従業員データ: 不存在")
            
            # 勤怠記録の確認
            response = self.spring_session.get(
                f"{SPRING_BOOT_URL}/api/test/attendance/records",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and len(data.get('data', [])) > 0:
                    print(f"✓ テスト勤怠記録: {len(data['data'])}件")
                else:
                    print("✗ テスト勤怠記録: 0件")
            else:
                print("✗ テスト勤怠記録: 取得失敗")
            
        except Exception as e:
            print(f"✗ 状態確認エラー: {e}")
    
    def validate_test_environment(self):
        """テスト環境の検証"""
        print("=== テスト環境検証 ===")
        
        # 1. サービス接続確認
        print("1. サービス接続確認")
        if self.wait_for_services(10):
            print("   ✓ Spring Boot (8080): 接続可能")
            print("   ✓ FastAPI (8081): 接続可能")
        else:
            print("   ✗ サービス接続不可")
            return False
        
        # 2. 認証確認
        print("2. 認証機能確認")
        try:
            response = self.spring_session.post(
                f"{SPRING_BOOT_URL}/api/auth/login",
                json={"username": "admin", "password": "pass"},
                timeout=10
            )
            if response.status_code == 200:
                print("   ✓ 管理者認証: 成功")
            else:
                print("   ✗ 管理者認証: 失敗")
        except Exception as e:
            print(f"   ✗ 認証確認エラー: {e}")
        
        # 3. PDFサービス確認
        print("3. PDFサービス確認")
        try:
            response = requests.post(
                f"{FASTAPI_URL}/reports/pdf",
                json={"employeeId": 1, "yearMonth": "2024-01"},
                timeout=10
            )
            if response.status_code in [200, 404]:  # 404は正常（テストデータなし）
                print("   ✓ PDFサービス: 応答可能")
            else:
                print(f"   ✗ PDFサービス: エラー ({response.status_code})")
        except Exception as e:
            print(f"   ✗ PDFサービス確認エラー: {e}")
        
        return True

def main():
    """メイン関数"""
    parser = argparse.ArgumentParser(description='勤怠管理システム テストデータ管理')
    parser.add_argument('action', choices=['setup', 'cleanup', 'status', 'validate'], 
                       help='実行するアクション')
    parser.add_argument('--timeout', type=int, default=60, 
                       help='サービス起動待機時間（秒）')
    
    args = parser.parse_args()
    
    manager = TestDataManager()
    
    if args.action == 'setup':
        success = manager.setup_test_data()
        sys.exit(0 if success else 1)
    
    elif args.action == 'cleanup':
        success = manager.cleanup_test_data()
        sys.exit(0 if success else 1)
    
    elif args.action == 'status':
        manager.check_test_data_status()
        sys.exit(0)
    
    elif args.action == 'validate':
        success = manager.validate_test_environment()
        sys.exit(0 if success else 1)
    
    else:
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()
