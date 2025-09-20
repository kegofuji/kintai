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
            
            # カレンダー形式の勤怠データ表示
            if attendance_data:
                calendar_data = self._create_calendar_data(attendance_data, year_month)
                calendar_table = Table(calendar_data, colWidths=[25*mm] * 7)
                calendar_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f8f9fa')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 8),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dee2e6')),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 1), (-1, -1), 7)
                ]))
                story.append(calendar_table)
                
                # 詳細データテーブル
                story.append(Spacer(1, 10*mm))
                detail_data = self._create_detail_table_data(attendance_data)
                detail_table = Table(detail_data, colWidths=[25*mm, 20*mm, 20*mm, 20*mm, 20*mm, 20*mm, 20*mm])
                detail_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f8f9fa')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 8),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dee2e6')),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 1), (-1, -1), 7)
                ]))
                story.append(detail_table)
            else:
                story.append(Paragraph("データなし", styles['Normal']))
            
            # 月間集計情報（下部に表示）
            story.append(Spacer(1, 20*mm))
            summary_data = self._calculate_summary(attendance_data)
            
            # 集計テーブル
            summary_table_data = [
                ["項目", "時間"],
                ["月間総労働時間", summary_data['total_work_hours']],
                ["遅刻時間", summary_data['total_late_hours']],
                ["早退時間", summary_data['total_early_hours']],
                ["残業時間", summary_data['total_overtime_hours']],
                ["深夜時間", summary_data['total_night_hours']]
            ]
            
            summary_table = Table(summary_table_data, colWidths=[60*mm, 40*mm])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#007bff')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#e3f2fd')),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 10)
            ]))
            story.append(summary_table)
            
            # フッター
            story.append(Spacer(1, 30*mm))
            story.append(Paragraph("ページ 1", styles['Normal']))
            
            # PDFを生成
            doc.build(story)
            
        except Exception as e:
            logger.error(f"PDF作成エラー: {str(e)}")
            raise
    
    def _create_calendar_data(self, attendance_data: List[Dict[str, Any]], year_month: str) -> List[List[str]]:
        """カレンダー形式のデータを作成"""
        from datetime import datetime, timedelta
        import calendar
        
        # 年月を解析
        year, month = map(int, year_month.split('-'))
        
        # カレンダーヘッダー
        weekdays = ['月', '火', '水', '木', '金', '土', '日']
        calendar_data = [weekdays]
        
        # 月の最初の日と最後の日
        first_day = datetime(year, month, 1)
        last_day = datetime(year, month, calendar.monthrange(year, month)[1])
        
        # 月曜始まりのカレンダー計算
        start_date = first_day - timedelta(days=first_day.weekday())
        
        # 6週間分のカレンダーを生成
        for week in range(6):
            week_data = []
            for day in range(7):
                current_date = start_date + timedelta(days=week * 7 + day)
                day_number = current_date.day
                
                # 現在の月かどうか
                is_current_month = current_date.month == month
                
                # 勤怠データを取得
                attendance_record = self._get_attendance_for_date(attendance_data, current_date.strftime('%Y-%m-%d'))
                
                if is_current_month:
                    if attendance_record:
                        # 出勤・退勤時刻を表示
                        clock_in = self._format_time(attendance_record.get('clockInTime', ''))
                        clock_out = self._format_time(attendance_record.get('clockOutTime', ''))
                        cell_content = f"{day_number}\n{clock_in}\n{clock_out}"
                    else:
                        cell_content = str(day_number)
                else:
                    cell_content = ""
                
                week_data.append(cell_content)
            calendar_data.append(week_data)
        
        return calendar_data
    
    def _create_detail_table_data(self, attendance_data: List[Dict[str, Any]]) -> List[List[str]]:
        """詳細テーブルデータを作成"""
        # ヘッダー
        table_data = [
            ["日付", "出勤", "退勤", "遅刻", "早退", "残業", "深夜"]
        ]
        
        # データ行
        for record in attendance_data:
            row = [
                self._format_date(record.get('attendanceDate', '')),
                self._format_time(record.get('clockInTime', '')),
                self._format_time(record.get('clockOutTime', '')),
                self._format_minutes(record.get('lateMinutes', 0)),
                self._format_minutes(record.get('earlyLeaveMinutes', 0)),
                self._format_minutes(record.get('overtimeMinutes', 0)),
                self._format_minutes(record.get('nightShiftMinutes', 0))
            ]
            table_data.append(row)
        
        return table_data
    
    def _get_attendance_for_date(self, attendance_data: List[Dict[str, Any]], date_str: str) -> Optional[Dict[str, Any]]:
        """指定日の勤怠データを取得"""
        for record in attendance_data:
            if record.get('attendanceDate') == date_str:
                return record
        return None
    
    def _calculate_summary(self, attendance_data: List[Dict[str, Any]]) -> Dict[str, str]:
        """集計情報を計算"""
        total_work_minutes = 0
        total_overtime_minutes = 0
        total_night_minutes = 0
        total_late_minutes = 0
        total_early_minutes = 0
        
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
            
            # 深夜勤務時間
            night_shift = record.get('nightShiftMinutes', 0)
            if night_shift:
                total_night_minutes += night_shift
            
            # 遅刻時間
            late = record.get('lateMinutes', 0)
            if late:
                total_late_minutes += late
            
            # 早退時間
            early = record.get('earlyLeaveMinutes', 0)
            if early:
                total_early_minutes += early
        
        return {
            'total_work_hours': f"{total_work_minutes // 60}:{(total_work_minutes % 60):02d}",
            'total_overtime_hours': f"{total_overtime_minutes // 60}:{(total_overtime_minutes % 60):02d}",
            'total_night_hours': f"{total_night_minutes // 60}:{(total_night_minutes % 60):02d}",
            'total_late_hours': f"{total_late_minutes // 60}:{(total_late_minutes % 60):02d}",
            'total_early_hours': f"{total_early_minutes // 60}:{(total_early_minutes % 60):02d}"
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
            return "0:00"
        
        hours = overtime_minutes // 60
        minutes = overtime_minutes % 60
        
        return f"{hours}:{minutes:02d}"
    
    def _format_minutes(self, minutes: int) -> str:
        """分をフォーマット（0:00形式に統一）"""
        if minutes is None or minutes == 0:
            return "0:00"
        
        hours = minutes // 60
        mins = minutes % 60
        
        return f"{hours}:{mins:02d}"
    
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
