#!/usr/bin/env python3
"""
勤怠管理システム PDF生成統合テスト
Spring Boot + FastAPI + Vanilla JS SPA の統合検証
"""

import pytest
import requests
import json
import os
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
import logging

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# テスト設定
SPRING_BOOT_URL = "http://localhost:8080"
FASTAPI_URL = "http://localhost:8081"
TEST_USER = "user1"
TEST_PASS = "pass"
ADMIN_USER = "admin"
ADMIN_PASS = "pass"
TEST_EMPLOYEE_ID = 6

class TestConfig:
    """テスト設定クラス"""
    def __init__(self):
        self.spring_boot_url = SPRING_BOOT_URL
        self.fastapi_url = FASTAPI_URL
        self.test_user = TEST_USER
        self.test_pass = TEST_PASS
        self.admin_user = ADMIN_USER
        self.admin_pass = ADMIN_PASS
        self.test_employee_id = TEST_EMPLOYEE_ID
        self.session = requests.Session()
        self.csrf_token = None

@pytest.fixture(scope="session")
def test_config():
    """テスト設定フィクスチャ"""
    return TestConfig()

@pytest.fixture(scope="session")
def authenticated_session(test_config):
    """認証済みセッションフィクスチャ"""
    # ログイン
    login_data = {
        "username": test_config.test_user,
        "password": test_config.test_pass
    }
    
    response = test_config.session.post(
        f"{test_config.spring_boot_url}/api/auth/login",
        json=login_data
    )
    
    assert response.status_code == 200
    login_result = response.json()
    assert login_result["success"] is True
    
    # CSRFトークン取得
    csrf_response = test_config.session.get(
        f"{test_config.spring_boot_url}/api/attendance/csrf-token"
    )
    
    if csrf_response.status_code == 200:
        csrf_data = csrf_response.json()
        test_config.csrf_token = csrf_data.get("token")
    
    yield test_config.session
    
    # クリーンアップ
    test_config.session.post(
        f"{test_config.spring_boot_url}/api/auth/logout"
    )

@pytest.fixture(scope="session")
def admin_session(test_config):
    """管理者認証済みセッションフィクスチャ"""
    admin_session = requests.Session()
    
    # 管理者ログイン
    login_data = {
        "username": test_config.admin_user,
        "password": test_config.admin_pass
    }
    
    response = admin_session.post(
        f"{test_config.spring_boot_url}/api/auth/login",
        json=login_data
    )
    
    assert response.status_code == 200
    login_result = response.json()
    assert login_result["success"] is True
    
    yield admin_session
    
    # クリーンアップ
    admin_session.post(
        f"{test_config.spring_boot_url}/api/auth/logout"
    )

class TestServerHealth:
    """サーバーヘルスチェックテスト"""
    
    def test_spring_boot_health(self, test_config):
        """Spring Bootサーバーのヘルスチェック"""
        response = requests.get(f"{test_config.spring_boot_url}/api/attendance/health")
        assert response.status_code == 200
        assert "勤怠管理システムは正常に動作しています" in response.text
    
    def test_fastapi_health(self, test_config):
        """FastAPIサーバーのヘルスチェック"""
        response = requests.get(f"{test_config.fastapi_url}/health")
        assert response.status_code == 200
        
        health_data = response.json()
        assert health_data["status"] == "healthy"
        assert "timestamp" in health_data

class TestAuthentication:
    """認証機能テスト"""
    
    def test_successful_login(self, test_config):
        """正常ログインテスト"""
        login_data = {
            "username": test_config.test_user,
            "password": test_config.test_pass
        }
        
        response = requests.post(
            f"{test_config.spring_boot_url}/api/auth/login",
            json=login_data
        )
        
        assert response.status_code == 200
        login_result = response.json()
        assert login_result["success"] is True
        assert login_result["username"] == test_config.test_user
        assert "employeeId" in login_result
    
    def test_failed_login(self, test_config):
        """ログイン失敗テスト"""
        login_data = {
            "username": test_config.test_user,
            "password": "wrongpassword"
        }
        
        response = requests.post(
            f"{test_config.spring_boot_url}/api/auth/login",
            json=login_data
        )
        
        assert response.status_code == 401
        login_result = response.json()
        assert login_result["success"] is False
    
    def test_admin_login(self, test_config):
        """管理者ログインテスト"""
        login_data = {
            "username": test_config.admin_user,
            "password": test_config.admin_pass
        }
        
        response = requests.post(
            f"{test_config.spring_boot_url}/api/auth/login",
            json=login_data
        )
        
        assert response.status_code == 200
        login_result = response.json()
        assert login_result["success"] is True
        assert login_result["username"] == test_config.admin_user

class TestAttendanceAPI:
    """勤怠APIテスト"""
    
    def test_clock_in(self, authenticated_session, test_config):
        """出勤打刻テスト"""
        clock_in_data = {
            "employeeId": test_config.test_employee_id
        }
        
        headers = {}
        if test_config.csrf_token:
            headers["X-CSRF-TOKEN"] = test_config.csrf_token
        
        response = authenticated_session.post(
            f"{test_config.spring_boot_url}/api/attendance/clock-in",
            json=clock_in_data,
            headers=headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
    
    def test_clock_out(self, authenticated_session, test_config):
        """退勤打刻テスト"""
        clock_out_data = {
            "employeeId": test_config.test_employee_id
        }
        
        headers = {}
        if test_config.csrf_token:
            headers["X-CSRF-TOKEN"] = test_config.csrf_token
        
        response = authenticated_session.post(
            f"{test_config.spring_boot_url}/api/attendance/clock-out",
            json=clock_out_data,
            headers=headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
    
    def test_attendance_history(self, authenticated_session, test_config):
        """勤怠履歴取得テスト"""
        response = authenticated_session.get(
            f"{test_config.spring_boot_url}/api/attendance/history/{test_config.test_employee_id}"
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "data" in result
    
    def test_monthly_submit(self, authenticated_session, test_config):
        """月末申請テスト"""
        current_month = datetime.now().strftime("%Y-%m")
        submit_data = {
            "employeeId": test_config.test_employee_id,
            "yearMonth": current_month
        }
        
        headers = {}
        if test_config.csrf_token:
            headers["X-CSRF-TOKEN"] = test_config.csrf_token
        
        response = authenticated_session.post(
            f"{test_config.spring_boot_url}/api/attendance/monthly-submit",
            json=submit_data,
            headers=headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True

class TestVacationAPI:
    """有給申請APIテスト"""
    
    def test_vacation_request(self, authenticated_session, test_config):
        """有給申請テスト"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        vacation_data = {
            "employeeId": test_config.test_employee_id,
            "startDate": tomorrow,
            "endDate": tomorrow,
            "reason": "私用のため"
        }
        
        headers = {}
        if test_config.csrf_token:
            headers["X-CSRF-TOKEN"] = test_config.csrf_token
        
        response = authenticated_session.post(
            f"{test_config.spring_boot_url}/api/vacation/request",
            json=vacation_data,
            headers=headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
    
    def test_vacation_request_past_date_error(self, authenticated_session, test_config):
        """過去日有給申請エラーテスト"""
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        vacation_data = {
            "employeeId": test_config.test_employee_id,
            "startDate": yesterday,
            "endDate": yesterday,
            "reason": "テスト"
        }
        
        headers = {}
        if test_config.csrf_token:
            headers["X-CSRF-TOKEN"] = test_config.csrf_token
        
        response = authenticated_session.post(
            f"{test_config.spring_boot_url}/api/vacation/request",
            json=vacation_data,
            headers=headers
        )
        
        # 過去日指定はエラーになることを期待
        assert response.status_code == 400
        result = response.json()
        assert result["success"] is False

class TestAdminAPI:
    """管理者APIテスト"""
    
    def test_get_employees(self, admin_session, test_config):
        """社員一覧取得テスト"""
        response = admin_session.get(
            f"{test_config.spring_boot_url}/api/admin/employees"
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "data" in result
    
    def test_get_pending_vacations(self, admin_session, test_config):
        """未承認有給申請一覧取得テスト"""
        response = admin_session.get(
            f"{test_config.spring_boot_url}/api/admin/vacation/pending"
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "data" in result

class TestPDFGeneration:
    """PDF生成テスト"""
    
    def test_fastapi_pdf_generation_direct(self, test_config):
        """FastAPI直接PDF生成テスト"""
        current_month = datetime.now().strftime("%Y-%m")
        pdf_request = {
            "employeeId": test_config.test_employee_id,
            "yearMonth": current_month
        }
        
        response = requests.post(
            f"{test_config.fastapi_url}/reports/pdf",
            json=pdf_request
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "url" in result
        
        # PDFダウンロードテスト
        pdf_url = result["url"]
        pdf_response = requests.get(pdf_url)
        assert pdf_response.status_code == 200
        assert pdf_response.headers["content-type"] == "application/pdf"
    
    def test_spring_boot_pdf_generation(self, admin_session, test_config):
        """Spring Boot経由PDF生成テスト"""
        current_month = datetime.now().strftime("%Y-%m")
        pdf_request = {
            "employeeId": test_config.test_employee_id,
            "yearMonth": current_month
        }
        
        response = admin_session.post(
            f"{test_config.spring_boot_url}/api/reports/generate",
            json=pdf_request
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "url" in result
        
        # PDFダウンロードテスト
        pdf_url = result["url"]
        pdf_response = requests.get(pdf_url)
        assert pdf_response.status_code == 200
        assert pdf_response.headers["content-type"] == "application/pdf"
    
    def test_pdf_content_validation(self, test_config):
        """PDF内容検証テスト"""
        current_month = datetime.now().strftime("%Y-%m")
        pdf_request = {
            "employeeId": test_config.test_employee_id,
            "yearMonth": current_month
        }
        
        # PDF生成
        response = requests.post(
            f"{test_config.fastapi_url}/reports/pdf",
            json=pdf_request
        )
        
        assert response.status_code == 200
        result = response.json()
        pdf_url = result["url"]
        
        # PDFダウンロード
        pdf_response = requests.get(pdf_url)
        assert pdf_response.status_code == 200
        
        # 一時ファイルに保存
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
            temp_file.write(pdf_response.content)
            temp_file_path = temp_file.name
        
        try:
            # PDFファイルの存在確認
            assert os.path.exists(temp_file_path)
            assert os.path.getsize(temp_file_path) > 0
            
            # PDFファイルの基本検証
            with open(temp_file_path, 'rb') as f:
                content = f.read()
                # PDFファイルのマジックナンバー確認
                assert content.startswith(b'%PDF-')
                
                # 基本的なPDF構造の確認
                assert b'obj' in content  # PDFオブジェクト
                assert b'endobj' in content  # PDFオブジェクト終了
                
        finally:
            # 一時ファイル削除
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    def test_pdf_filename_format(self, test_config):
        """PDFファイル名フォーマットテスト"""
        current_month = datetime.now().strftime("%Y-%m")
        pdf_request = {
            "employeeId": test_config.test_employee_id,
            "yearMonth": current_month
        }
        
        response = requests.post(
            f"{test_config.fastapi_url}/reports/pdf",
            json=pdf_request
        )
        
        assert response.status_code == 200
        result = response.json()
        pdf_url = result["url"]
        
        # URLからファイル名を抽出
        filename = pdf_url.split('/')[-1]
        expected_pattern = f"report_{test_config.test_employee_id}_{current_month.replace('-', '')}.pdf"
        
        assert filename == expected_pattern

class TestErrorHandling:
    """エラーハンドリングテスト"""
    
    def test_unauthorized_access(self, test_config):
        """認証なしアクセステスト"""
        response = requests.get(
            f"{test_config.spring_boot_url}/api/attendance/history/{test_config.test_employee_id}"
        )
        
        # 認証なしアクセスは403または401を期待
        assert response.status_code in [401, 403]
    
    def test_invalid_employee_id(self, authenticated_session, test_config):
        """無効な従業員IDテスト"""
        invalid_employee_id = 99999
        
        response = authenticated_session.get(
            f"{test_config.spring_boot_url}/api/attendance/history/{invalid_employee_id}"
        )
        
        # 無効な従業員IDは404またはエラーを期待
        assert response.status_code in [400, 404, 500]
    
    def test_invalid_month_format(self, authenticated_session, test_config):
        """無効な月フォーマットテスト"""
        invalid_month = "2024/01"  # 正しくは2024-01
        
        headers = {}
        if test_config.csrf_token:
            headers["X-CSRF-TOKEN"] = test_config.csrf_token
        
        response = authenticated_session.post(
            f"{test_config.spring_boot_url}/api/attendance/monthly-submit",
            json={
                "employeeId": test_config.test_employee_id,
                "yearMonth": invalid_month
            },
            headers=headers
        )
        
        # 無効なフォーマットは400エラーを期待
        assert response.status_code == 400

class TestIntegrationFlow:
    """統合フローテスト"""
    
    def test_complete_attendance_flow(self, authenticated_session, test_config):
        """完全な勤怠フローテスト"""
        # 1. 出勤打刻
        clock_in_data = {"employeeId": test_config.test_employee_id}
        headers = {}
        if test_config.csrf_token:
            headers["X-CSRF-TOKEN"] = test_config.csrf_token
        
        response = authenticated_session.post(
            f"{test_config.spring_boot_url}/api/attendance/clock-in",
            json=clock_in_data,
            headers=headers
        )
        assert response.status_code == 200
        assert response.json()["success"] is True
        
        # 2. 勤怠履歴確認
        response = authenticated_session.get(
            f"{test_config.spring_boot_url}/api/attendance/history/{test_config.test_employee_id}"
        )
        assert response.status_code == 200
        assert response.json()["success"] is True
        
        # 3. 退勤打刻
        clock_out_data = {"employeeId": test_config.test_employee_id}
        response = authenticated_session.post(
            f"{test_config.spring_boot_url}/api/attendance/clock-out",
            json=clock_out_data,
            headers=headers
        )
        assert response.status_code == 200
        assert response.json()["success"] is True
        
        # 4. 月末申請
        current_month = datetime.now().strftime("%Y-%m")
        submit_data = {
            "employeeId": test_config.test_employee_id,
            "yearMonth": current_month
        }
        response = authenticated_session.post(
            f"{test_config.spring_boot_url}/api/attendance/monthly-submit",
            json=submit_data,
            headers=headers
        )
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_complete_admin_flow(self, admin_session, test_config):
        """完全な管理者フローテスト"""
        # 1. 社員一覧取得
        response = admin_session.get(
            f"{test_config.spring_boot_url}/api/admin/employees"
        )
        assert response.status_code == 200
        assert response.json()["success"] is True
        
        # 2. 未承認申請一覧取得
        response = admin_session.get(
            f"{test_config.spring_boot_url}/api/admin/vacation/pending"
        )
        assert response.status_code == 200
        assert response.json()["success"] is True
        
        # 3. PDF生成
        current_month = datetime.now().strftime("%Y-%m")
        pdf_request = {
            "employeeId": test_config.test_employee_id,
            "yearMonth": current_month
        }
        response = admin_session.post(
            f"{test_config.spring_boot_url}/api/reports/generate",
            json=pdf_request
        )
        assert response.status_code == 200
        result = response.json()
        assert "url" in result
        
        # 4. PDFダウンロード確認
        pdf_url = result["url"]
        pdf_response = requests.get(pdf_url)
        assert pdf_response.status_code == 200
        assert pdf_response.headers["content-type"] == "application/pdf"

if __name__ == "__main__":
    # テスト実行
    pytest.main([__file__, "-v", "--tb=short"])