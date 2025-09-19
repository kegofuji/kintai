import pytest
import asyncio
import os
import tempfile
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from httpx import AsyncClient

from main import app
from services.pdf_generator import PDFGenerator
from services.file_manager import FileManager

class TestPDFGeneration:
    """PDF生成機能のテスト"""
    
    @pytest.fixture
    def client(self):
        """テストクライアント"""
        return TestClient(app)
    
    @pytest.fixture
    def mock_employee_data(self):
        """モック従業員データ"""
        return {
            "employeeId": 2,
            "employeeCode": "EMP002",
            "lastName": "佐藤",
            "firstName": "花子",
            "email": "sato@example.com",
            "hireDate": "2020-04-01"
        }
    
    @pytest.fixture
    def mock_attendance_data(self):
        """モック勤怠データ"""
        return [
            {
                "attendanceId": 1,
                "employeeId": 2,
                "attendanceDate": "2025-09-01",
                "clockInTime": "2025-09-01T09:00:00",
                "clockOutTime": "2025-09-01T18:00:00",
                "overtimeMinutes": 60,
                "lateMinutes": 0,
                "earlyLeaveMinutes": 0,
                "attendanceStatus": "NORMAL"
            },
            {
                "attendanceId": 2,
                "employeeId": 2,
                "attendanceDate": "2025-09-02",
                "clockInTime": "2025-09-02T09:15:00",
                "clockOutTime": "2025-09-02T18:30:00",
                "overtimeMinutes": 90,
                "lateMinutes": 15,
                "earlyLeaveMinutes": 0,
                "attendanceStatus": "LATE"
            }
        ]
    
    def test_generate_pdf_report_success(self, client, mock_employee_data, mock_attendance_data):
        """PDF生成成功テスト（認証なし）"""
        with patch('services.pdf_generator.PDFGenerator._fetch_employee_data') as mock_fetch_employee, \
             patch('services.pdf_generator.PDFGenerator._fetch_attendance_data') as mock_fetch_attendance, \
             patch('services.pdf_generator.PDFGenerator._create_pdf') as mock_create_pdf:
            
            # モックの設定
            mock_fetch_employee.return_value = mock_employee_data
            mock_fetch_attendance.return_value = mock_attendance_data
            mock_create_pdf.return_value = None
            
            # リクエストデータ
            request_data = {
                "employeeId": 2,
                "yearMonth": "2025-09"
            }
            
            # API呼び出し（認証なし）
            response = client.post("/reports/pdf", json=request_data)
            
            # レスポンス検証
            assert response.status_code == 200
            response_data = response.json()
            assert "url" in response_data
            assert response_data["url"].startswith("http://localhost:8081/reports/tmp/")
            assert "report_2_202509.pdf" in response_data["url"]
    
    def test_generate_pdf_report_success_with_auth(self, client, mock_employee_data, mock_attendance_data):
        """PDF生成成功テスト（認証あり）"""
        with patch('services.pdf_generator.PDFGenerator._fetch_employee_data') as mock_fetch_employee, \
             patch('services.pdf_generator.PDFGenerator._fetch_attendance_data') as mock_fetch_attendance, \
             patch('services.pdf_generator.PDFGenerator._create_pdf') as mock_create_pdf:
            
            # モックの設定
            mock_fetch_employee.return_value = mock_employee_data
            mock_fetch_attendance.return_value = mock_attendance_data
            mock_create_pdf.return_value = None
            
            # リクエストデータ
            request_data = {
                "employeeId": 2,
                "yearMonth": "2025-09"
            }
            
            # API呼び出し（認証あり）
            headers = {"Authorization": "Bearer test-key"}
            response = client.post("/reports/pdf", json=request_data, headers=headers)
            
            # レスポンス検証
            assert response.status_code == 200
            response_data = response.json()
            assert "url" in response_data
            assert response_data["url"].startswith("http://localhost:8081/reports/tmp/")
            assert "report_2_202509.pdf" in response_data["url"]
    
    def test_generate_pdf_report_invalid_employee_id(self, client):
        """無効な従業員IDテスト"""
        request_data = {
            "employeeId": 0,  # 無効なID
            "yearMonth": "2025-09"
        }
        
        response = client.post("/reports/pdf", json=request_data)
        assert response.status_code == 422  # Validation Error
    
    def test_generate_pdf_report_invalid_year_month_format(self, client):
        """無効な年月フォーマットテスト"""
        request_data = {
            "employeeId": 2,
            "yearMonth": "2025/09"  # 無効なフォーマット
        }
        
        response = client.post("/reports/pdf", json=request_data)
        assert response.status_code == 422  # Validation Error
    
    def test_generate_pdf_report_employee_not_found(self, client):
        """従業員が見つからない場合のテスト"""
        with patch('services.pdf_generator.PDFGenerator._fetch_employee_data') as mock_fetch_employee:
            # 従業員が見つからない場合のモック
            mock_fetch_employee.side_effect = FileNotFoundError("従業員ID 999 のデータが見つかりません")
            
            request_data = {
                "employeeId": 999,
                "yearMonth": "2025-09"
            }
            
            response = client.post("/reports/pdf", json=request_data)
            assert response.status_code == 404
            assert "従業員データが見つかりません" in response.json()["detail"]
    
    def test_generate_pdf_report_pdf_generation_error(self, client, mock_employee_data):
        """PDF生成エラーのテスト"""
        with patch('services.pdf_generator.PDFGenerator._fetch_employee_data') as mock_fetch_employee, \
             patch('services.pdf_generator.PDFGenerator._fetch_attendance_data') as mock_fetch_attendance, \
             patch('services.pdf_generator.PDFGenerator._create_pdf') as mock_create_pdf:
            
            # モックの設定
            mock_fetch_employee.return_value = mock_employee_data
            mock_fetch_attendance.return_value = []
            mock_create_pdf.side_effect = Exception("PDF生成エラー")
            
            request_data = {
                "employeeId": 2,
                "yearMonth": "2025-09"
            }
            
            response = client.post("/reports/pdf", json=request_data)
            assert response.status_code == 500
            assert "PDF生成に失敗しました" in response.json()["detail"]
    
    def test_get_pdf_file_success(self, client):
        """PDFファイル取得成功テスト"""
        # テスト用のPDFファイルを作成
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_file:
            tmp_file.write(b"Mock PDF Content")
            tmp_file_path = tmp_file.name
        
        try:
            # ファイルをtmpディレクトリに移動
            os.makedirs("tmp", exist_ok=True)
            test_filename = "test_report.pdf"
            test_filepath = os.path.join("tmp", test_filename)
            os.rename(tmp_file_path, test_filepath)
            
            # API呼び出し
            response = client.get(f"/reports/tmp/{test_filename}")
            
            # レスポンス検証
            assert response.status_code == 200
            assert response.headers["content-type"] == "application/pdf"
            assert response.content == b"Mock PDF Content"
            
        finally:
            # テストファイルを削除
            if os.path.exists(test_filepath):
                os.remove(test_filepath)
    
    def test_get_pdf_file_not_found(self, client):
        """PDFファイルが見つからない場合のテスト"""
        response = client.get("/reports/tmp/nonexistent.pdf")
        assert response.status_code == 404
        assert "ファイルが見つかりません" in response.json()["detail"]
    
    def test_delete_pdf_file_success(self, client):
        """PDFファイル削除成功テスト"""
        # テスト用のPDFファイルを作成
        os.makedirs("tmp", exist_ok=True)
        test_filename = "test_delete.pdf"
        test_filepath = os.path.join("tmp", test_filename)
        
        with open(test_filepath, "w") as f:
            f.write("Mock PDF Content")
        
        try:
            # API呼び出し
            response = client.delete(f"/reports/tmp/{test_filename}")
            
            # レスポンス検証
            assert response.status_code == 200
            assert "削除しました" in response.json()["message"]
            
            # ファイルが削除されていることを確認
            assert not os.path.exists(test_filepath)
            
        finally:
            # 念のためファイルを削除
            if os.path.exists(test_filepath):
                os.remove(test_filepath)
    
    def test_delete_pdf_file_not_found(self, client):
        """削除対象のPDFファイルが見つからない場合のテスト"""
        response = client.delete("/reports/tmp/nonexistent.pdf")
        assert response.status_code == 404
        assert "ファイルが見つかりません" in response.json()["detail"]
    
    def test_health_check(self, client):
        """ヘルスチェックテスト"""
        response = client.get("/health")
        assert response.status_code == 200
        response_data = response.json()
        assert response_data["status"] == "healthy"
        assert "timestamp" in response_data

class TestPDFGenerator:
    """PDFGeneratorクラスのテスト"""
    
    @pytest.fixture
    def pdf_generator(self):
        """PDFGeneratorインスタンス"""
        return PDFGenerator()
    
    def test_format_year_month(self, pdf_generator):
        """年月フォーマットテスト"""
        assert pdf_generator._format_year_month("2025-09") == "2025年09月"
        assert pdf_generator._format_year_month("2024-12") == "2024年12月"
    
    def test_format_date(self, pdf_generator):
        """日付フォーマットテスト"""
        assert pdf_generator._format_date("2025-09-01T00:00:00") == "2025/09/01"
        assert pdf_generator._format_date("") == ""
    
    def test_format_time(self, pdf_generator):
        """時刻フォーマットテスト"""
        assert pdf_generator._format_time("2025-09-01T09:00:00") == "09:00"
        assert pdf_generator._format_time("") == ""
    
    def test_format_overtime(self, pdf_generator):
        """残業時間フォーマットテスト"""
        assert pdf_generator._format_overtime(0) == ""
        assert pdf_generator._format_overtime(60) == "1時間"
        assert pdf_generator._format_overtime(90) == "1時間30分"
        assert pdf_generator._format_overtime(30) == "30分"
    
    def test_get_status_display(self, pdf_generator):
        """ステータス表示テスト"""
        assert pdf_generator._get_status_display("NORMAL") == "通常"
        assert pdf_generator._get_status_display("LATE") == "遅刻"
        assert pdf_generator._get_status_display("EARLY_LEAVE") == "早退"
        assert pdf_generator._get_status_display("OVERTIME") == "残業"
        assert pdf_generator._get_status_display("NIGHT_SHIFT") == "深夜勤務"
        assert pdf_generator._get_status_display("ABSENT") == "欠勤"
        assert pdf_generator._get_status_display("UNKNOWN") == "UNKNOWN"
    
    def test_calculate_summary(self, pdf_generator):
        """集計計算テスト"""
        attendance_data = [
            {
                "overtimeMinutes": 60,
                "attendanceStatus": "NORMAL"
            },
            {
                "overtimeMinutes": 90,
                "attendanceStatus": "NIGHT_SHIFT"
            }
        ]
        
        summary = pdf_generator._calculate_summary(attendance_data)
        
        assert "total_work_hours" in summary
        assert "total_overtime_hours" in summary
        assert "total_night_hours" in summary
        assert "vacation_days" in summary

class TestFileManager:
    """FileManagerクラスのテスト"""
    
    @pytest.fixture
    def file_manager(self):
        """FileManagerインスタンス"""
        return FileManager("test_tmp")
    
    def test_get_file_path(self, file_manager):
        """ファイルパス取得テスト"""
        expected_path = os.path.join("test_tmp", "test.pdf")
        assert file_manager.get_file_path("test.pdf") == expected_path
    
    def test_file_exists(self, file_manager):
        """ファイル存在チェックテスト"""
        # 存在しないファイル
        assert not file_manager.file_exists("nonexistent.pdf")
        
        # テストディレクトリとファイルを作成
        os.makedirs("test_tmp", exist_ok=True)
        test_file = os.path.join("test_tmp", "test.pdf")
        
        try:
            with open(test_file, "w") as f:
                f.write("test content")
            
            assert file_manager.file_exists("test.pdf")
            
        finally:
            # テストファイルを削除
            if os.path.exists(test_file):
                os.remove(test_file)
            if os.path.exists("test_tmp"):
                os.rmdir("test_tmp")
    
    def test_delete_file(self, file_manager):
        """ファイル削除テスト"""
        # テストディレクトリとファイルを作成
        os.makedirs("test_tmp", exist_ok=True)
        test_file = os.path.join("test_tmp", "test_delete.pdf")
        
        try:
            with open(test_file, "w") as f:
                f.write("test content")
            
            # ファイルが存在することを確認
            assert os.path.exists(test_file)
            
            # ファイルを削除
            result = file_manager.delete_file("test_delete.pdf")
            assert result is True
            assert not os.path.exists(test_file)
            
        finally:
            # 念のためファイルを削除
            if os.path.exists(test_file):
                os.remove(test_file)
            if os.path.exists("test_tmp"):
                os.rmdir("test_tmp")
    
    def test_list_files(self, file_manager):
        """ファイル一覧取得テスト"""
        # テストディレクトリを作成
        os.makedirs("test_tmp", exist_ok=True)
        
        try:
            # 初期状態
            files = file_manager.list_files()
            assert isinstance(files, list)
            
            # テストファイルを作成
            test_files = ["test1.pdf", "test2.pdf"]
            for filename in test_files:
                with open(os.path.join("test_tmp", filename), "w") as f:
                    f.write("test content")
            
            # ファイル一覧を取得
            files = file_manager.list_files()
            assert len(files) == 2
            assert "test1.pdf" in files
            assert "test2.pdf" in files
            
        finally:
            # テストファイルを削除
            for filename in test_files:
                test_file = os.path.join("test_tmp", filename)
                if os.path.exists(test_file):
                    os.remove(test_file)
            if os.path.exists("test_tmp"):
                os.rmdir("test_tmp")
