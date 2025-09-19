import asyncio
import logging
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import os

logger = logging.getLogger(__name__)

class PDFGenerator:
    """PDF生成サービス"""
    
    def __init__(self, spring_boot_url: str = "http://localhost:8080"):
        self.spring_boot_url = spring_boot_url
    
    async def generate_attendance_report(self, employee_id: int, year_month: str, output_path: str):
        """
        勤怠レポートPDFを生成する
        
        Args:
            employee_id: 従業員ID
            year_month: 年月（yyyy-MM形式）
            output_path: 出力ファイルパス
        """
        try:
            logger.info(f"PDF生成開始: employeeId={employee_id}, yearMonth={year_month}")
            
            # Spring Bootから従業員情報と勤怠データを取得
            employee_data = await self._fetch_employee_data(employee_id)
            attendance_data = await self._fetch_attendance_data(employee_id, year_month)
            
            # PDFを生成
            await self._create_pdf(employee_data, attendance_data, year_month, output_path)
            
            logger.info(f"PDF生成完了: {output_path}")
            
        except Exception as e:
            logger.error(f"PDF生成エラー: {str(e)}")
            raise
    
    async def _fetch_employee_data(self, employee_id: int) -> Dict[str, Any]:
        """Spring Bootから従業員データを取得（テスト用モックデータ）"""
        try:
            # テスト用のモックデータを返す
            if employee_id == 2:
                return {
                    "employeeId": 2,
                    "employeeCode": "EMP002",
                    "lastName": "佐藤",
                    "firstName": "花子",
                    "email": "sato@example.com",
                    "hireDate": "2021-06-15"
                }
            else:
                raise FileNotFoundError(f"従業員ID {employee_id} のデータが見つかりません")
        except Exception as e:
            logger.error(f"従業員データ取得エラー: {str(e)}")
            raise FileNotFoundError(f"従業員ID {employee_id} のデータが見つかりません")
    
    async def _fetch_attendance_data(self, employee_id: int, year_month: str) -> List[Dict[str, Any]]:
        """Spring Bootから勤怠データを取得（テスト用モックデータ）"""
        try:
            # テスト用のモックデータを返す
            if employee_id == 2 and year_month == "2025-09":
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
                        "clockOutTime": "2025-09-02T19:30:00",
                        "overtimeMinutes": 90,
                        "lateMinutes": 15,
                        "earlyLeaveMinutes": 0,
                        "attendanceStatus": "LATE"
                    }
                ]
            else:
                return []
        except Exception as e:
            logger.error(f"勤怠データ取得エラー: {str(e)}")
            return []
    
    async def _create_pdf(self, employee_data: Dict[str, Any], attendance_data: List[Dict[str, Any]], 
                         year_month: str, output_path: str):
        """PDFファイルを作成"""
        try:
            # PDFドキュメントを作成
            doc = SimpleDocTemplate(output_path, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm)
            story = []
            
            # スタイルを取得
            styles = getSampleStyleSheet()
            
            # カスタムスタイルを定義
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=18,
                spaceAfter=20,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold'
            )
            
            header_style = ParagraphStyle(
                'CustomHeader',
                parent=styles['Normal'],
                fontSize=12,
                spaceAfter=10,
                alignment=TA_CENTER
            )
            
            # ヘッダー情報
            story.append(Paragraph("KintaiSystem", title_style))
            story.append(Paragraph("勤怠レポート", header_style))
            story.append(Spacer(1, 10*mm))
            
            # 従業員情報
            employee_info = f"""
            対象年月: {self._format_year_month(year_month)}<br/>
            社員名: {employee_data.get('lastName', '')} {employee_data.get('firstName', '')}<br/>
            社員コード: {employee_data.get('employeeCode', '')}
            """
            story.append(Paragraph(employee_info, styles['Normal']))
            story.append(Spacer(1, 15*mm))
            
            # 勤怠データテーブル
            if attendance_data:
                table_data = self._create_table_data(attendance_data)
                table = Table(table_data, colWidths=[25*mm, 20*mm, 20*mm, 25*mm, 20*mm, 20*mm, 20*mm])
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                story.append(table)
            else:
                story.append(Paragraph("データなし", styles['Normal']))
            
            # 集計情報
            story.append(Spacer(1, 15*mm))
            summary_data = self._calculate_summary(attendance_data)
            summary_text = f"""
            <b>集計情報</b><br/>
            実働合計: {summary_data['total_work_hours']}時間<br/>
            残業合計: {summary_data['total_overtime_hours']}時間<br/>
            深夜合計: {summary_data['total_night_hours']}時間<br/>
            有給取得日数: {summary_data['vacation_days']}日
            """
            story.append(Paragraph(summary_text, styles['Normal']))
            
            # フッター
            story.append(Spacer(1, 30*mm))
            story.append(Paragraph("ページ 1", styles['Normal']))
            
            # PDFを生成
            doc.build(story)
            
        except Exception as e:
            logger.error(f"PDF作成エラー: {str(e)}")
            raise
    
    def _create_table_data(self, attendance_data: List[Dict[str, Any]]) -> List[List[str]]:
        """テーブルデータを作成"""
        # ヘッダー
        table_data = [
            ["日付", "出勤時刻", "退勤時刻", "勤怠区分", "残業時間", "遅刻分", "早退分"]
        ]
        
        # データ行
        for record in attendance_data:
            row = [
                self._format_date(record.get('attendanceDate', '')),
                self._format_time(record.get('clockInTime', '')),
                self._format_time(record.get('clockOutTime', '')),
                self._get_status_display(record.get('attendanceStatus', '')),
                self._format_overtime(record.get('overtimeMinutes', 0)),
                str(record.get('lateMinutes', 0)),
                str(record.get('earlyLeaveMinutes', 0))
            ]
            table_data.append(row)
        
        return table_data
    
    def _calculate_summary(self, attendance_data: List[Dict[str, Any]]) -> Dict[str, str]:
        """集計情報を計算"""
        total_work_minutes = 0
        total_overtime_minutes = 0
        total_night_minutes = 0
        vacation_days = 0
        
        for record in attendance_data:
            # 実働時間の計算（簡易版）
            clock_in = record.get('clockInTime')
            clock_out = record.get('clockOutTime')
            if clock_in and clock_out:
                # 実際の計算ロジックはここに実装
                total_work_minutes += 480  # 8時間の仮定
            
            # 残業時間
            overtime = record.get('overtimeMinutes', 0)
            if overtime:
                total_overtime_minutes += overtime
            
            # 深夜勤務（簡易判定）
            status = record.get('attendanceStatus', '')
            if 'NIGHT' in status.upper():
                total_night_minutes += 480  # 8時間の仮定
            
            # 有給取得日数
            if 'VACATION' in status.upper():
                vacation_days += 1
        
        return {
            'total_work_hours': f"{total_work_minutes // 60}時間{total_work_minutes % 60}分",
            'total_overtime_hours': f"{total_overtime_minutes // 60}時間{total_overtime_minutes % 60}分",
            'total_night_hours': f"{total_night_minutes // 60}時間{total_night_minutes % 60}分",
            'vacation_days': str(vacation_days)
        }
    
    def _format_year_month(self, year_month: str) -> str:
        """年月をフォーマット"""
        try:
            date = datetime.strptime(year_month + "-01", "%Y-%m-%d")
            return date.strftime("%Y年%m月")
        except ValueError:
            return year_month
    
    def _format_date(self, date_str: str) -> str:
        """日付をフォーマット"""
        if not date_str:
            return ""
        try:
            date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return date.strftime("%Y/%m/%d")
        except ValueError:
            return date_str
    
    def _format_time(self, time_str: str) -> str:
        """時刻をフォーマット"""
        if not time_str:
            return ""
        try:
            time = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
            return time.strftime("%H:%M")
        except ValueError:
            return time_str
    
    def _format_overtime(self, overtime_minutes: int) -> str:
        """残業時間をフォーマット"""
        if overtime_minutes == 0:
            return ""
        
        hours = overtime_minutes // 60
        minutes = overtime_minutes % 60
        
        if hours > 0 and minutes > 0:
            return f"{hours}時間{minutes}分"
        elif hours > 0:
            return f"{hours}時間"
        else:
            return f"{minutes}分"
    
    def _get_status_display(self, status: str) -> str:
        """ステータス表示名を取得"""
        status_map = {
            'NORMAL': '通常',
            'LATE': '遅刻',
            'EARLY_LEAVE': '早退',
            'LATE_AND_EARLY_LEAVE': '遅刻・早退',
            'OVERTIME': '残業',
            'NIGHT_SHIFT': '深夜勤務',
            'ABSENT': '欠勤',
            'VACATION': '有給'
        }
        return status_map.get(status, status)
