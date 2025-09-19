#!/usr/bin/env python3
"""
テストデータセットアップスクリプト
Spring Boot APIを使用してテストデータを作成
"""

import requests
import json
import time
from datetime import datetime, timedelta

# 設定
SPRING_BOOT_URL = "http://localhost:8080"

def create_test_employees():
    """テスト従業員データを作成"""
    employees = [
        {
            "employeeId": 1,
            "employeeCode": "E001",
            "firstName": "太郎",
            "lastName": "山田",
            "email": "yamada@example.com",
            "hireDate": "2024-01-01",
            "isActive": True
        },
        {
            "employeeId": 2,
            "employeeCode": "E002", 
            "firstName": "花子",
            "lastName": "鈴木",
            "email": "suzuki@example.com",
            "hireDate": "2024-01-01",
            "isActive": True
        },
        {
            "employeeId": 3,
            "employeeCode": "E003",
            "firstName": "次郎", 
            "lastName": "田中",
            "email": "tanaka@example.com",
            "hireDate": "2024-01-01",
            "isActive": False
        }
    ]
    
    for employee in employees:
        try:
            response = requests.post(
                f"{SPRING_BOOT_URL}/api/admin/employees",
                json=employee
            )
            if response.status_code == 200:
                print(f"✅ 従業員作成成功: {employee['employeeCode']}")
            else:
                print(f"⚠️  従業員作成スキップ: {employee['employeeCode']} (既に存在)")
        except Exception as e:
            print(f"❌ 従業員作成エラー: {employee['employeeCode']} - {e}")

def create_test_users():
    """テストユーザーデータを作成"""
    users = [
        {
            "username": "user1",
            "password": "StrongPass123!",
            "employeeId": 1,
            "role": "USER"
        },
        {
            "username": "admin", 
            "password": "StrongPass123!",
            "employeeId": 2,
            "role": "ADMIN"
        },
        {
            "username": "retired_user",
            "password": "StrongPass123!",
            "employeeId": 3,
            "role": "USER"
        }
    ]
    
    for user in users:
        try:
            response = requests.post(
                f"{SPRING_BOOT_URL}/api/auth/register",
                json=user
            )
            if response.status_code == 200:
                print(f"✅ ユーザー作成成功: {user['username']}")
            else:
                print(f"⚠️  ユーザー作成スキップ: {user['username']} (既に存在)")
                print(f"   レスポンス: {response.text}")
        except Exception as e:
            print(f"❌ ユーザー作成エラー: {user['username']} - {e}")

def create_test_attendance():
    """テスト勤怠データを作成"""
    today = datetime.now().strftime("%Y-%m-%d")
    
    attendance_data = [
        {
            "employeeId": 1,
            "attendanceDate": today,
            "clockInTime": f"{today}T09:00:00",
            "clockOutTime": f"{today}T18:00:00",
            "workingHours": 8.0,
            "status": "COMPLETED"
        },
        {
            "employeeId": 2,
            "attendanceDate": today,
            "clockInTime": f"{today}T09:00:00",
            "status": "WORKING"
        }
    ]
    
    for attendance in attendance_data:
        try:
            response = requests.post(
                f"{SPRING_BOOT_URL}/api/attendance/clock-in",
                json={"employeeId": attendance["employeeId"]}
            )
            if response.status_code == 200:
                print(f"✅ 勤怠データ作成成功: 従業員ID {attendance['employeeId']}")
            else:
                print(f"⚠️  勤怠データ作成スキップ: 従業員ID {attendance['employeeId']}")
                print(f"   レスポンス: {response.text}")
        except Exception as e:
            print(f"❌ 勤怠データ作成エラー: 従業員ID {attendance['employeeId']} - {e}")

def main():
    print("🧪 テストデータセットアップ開始")
    print("=" * 50)
    
    # サーバー起動確認
    try:
        response = requests.get(f"{SPRING_BOOT_URL}/api/attendance/health")
        if response.status_code == 200:
            print("✅ Spring Bootサーバーが起動中")
        else:
            print("❌ Spring Bootサーバーに接続できません")
            return
    except Exception as e:
        print(f"❌ サーバー接続エラー: {e}")
        return
    
    # テストデータ作成
    print("\n📝 従業員データ作成中...")
    create_test_employees()
    
    print("\n👤 ユーザーデータ作成中...")
    create_test_users()
    
    print("\n⏰ 勤怠データ作成中...")
    create_test_attendance()
    
    print("\n✅ テストデータセットアップ完了")
    print("=" * 50)
    print("テスト実行可能です:")
    print("  ./test_integration.sh")
    print("  python3 -m pytest test_pdf_integration.py -v")

if __name__ == "__main__":
    main()
