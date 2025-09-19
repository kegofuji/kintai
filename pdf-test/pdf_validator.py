#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDF検証ツール
Java側で出力された勤怠レポートPDFの内容を検証するツール
"""

import re
import os
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas
try:
    from PyPDF2 import PdfReader
except ImportError:
    try:
        from PyPDF2 import PdfFileReader as PdfReader
    except ImportError:
        from PyPDF2.pdf import PdfFileReader as PdfReader
import logging

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class PDFValidator:
    """PDF検証クラス"""
    
    def __init__(self):
        self.validation_results = {}
    
    def validate_pdf(self, pdf_path: str, debug: bool = False) -> Dict[str, bool]:
        """
        PDFファイルを検証する
        
        Args:
            pdf_path: 検証するPDFファイルのパス
            debug: デバッグ情報を表示するかどうか
            
        Returns:
            検証結果の辞書
        """
        logger.info(f"PDF検証開始: {pdf_path}")
        
        try:
            # PDFを読み込み
            reader = PdfReader(pdf_path)
            text_content = ""
            
            # 全ページのテキストを取得
            for page in reader.pages:
                text_content += page.extract_text() + "\n"
            
            if debug:
                print(f"\n=== {pdf_path} の内容 ===")
                print(text_content)
                print("=" * 50)
            
            # 各項目をチェック
            results = {
                'header_kintai_system': self._check_header_kintai_system(text_content),
                'year_month_format': self._check_year_month_format(text_content),
                'employee_info': self._check_employee_info(text_content),
                'attendance_data': self._check_attendance_data(text_content),
                'footer_approval': self._check_footer_approval(text_content),
                'footer_page_number': self._check_footer_page_number(text_content),
                'no_data_message': self._check_no_data_message(text_content)
            }
            
            # 全体の合格判定
            # データなしの場合は社員情報と勤怠データは不要
            if results['no_data_message']:
                results['overall_pass'] = all([
                    results['header_kintai_system'],
                    results['year_month_format'],
                    results['footer_approval'],
                    results['footer_page_number']
                ])
            else:
                results['overall_pass'] = all([
                    results['header_kintai_system'],
                    results['year_month_format'],
                    results['employee_info'],
                    results['attendance_data'],
                    results['footer_approval'],
                    results['footer_page_number']
                ])
            
            self.validation_results[pdf_path] = results
            logger.info(f"PDF検証完了: {pdf_path} - 合格: {results['overall_pass']}")
            
            return results
            
        except Exception as e:
            logger.error(f"PDF検証エラー: {pdf_path} - {str(e)}")
            return {'error': str(e), 'overall_pass': False}
    
    def _check_header_kintai_system(self, text: str) -> bool:
        """ヘッダーに「KintaiSystem」があるかチェック"""
        return "KintaiSystem" in text
    
    def _check_year_month_format(self, text: str) -> bool:
        """対象年月がyyyy-MM形式で記載されているかチェック"""
        # yyyy-MM形式のパターンを検索
        pattern = r'\b\d{4}-\d{2}\b'
        matches = re.findall(pattern, text)
        return len(matches) > 0
    
    def _check_employee_info(self, text: str) -> bool:
        """社員名・社員コードが出力されているかチェック"""
        # 社員名と社員コードのパターンを検索
        # 社員名: 日本語の名前パターン（ひらがな、カタカナ、漢字、または文字化けした文字）
        # ただし、「社員」「コード」などの単語は除外
        name_pattern = r'[一-龯ひ-んァ-ヶ■]{2,4}'
        # 社員コード: 英数字の組み合わせ（EMP001など）
        code_pattern = r'[A-Za-z]{2,4}\d{3,6}'
        
        # 社員名の検索（「社員名:」または「■■■:」の後に続く名前を検索）
        name_match = re.search(r'(社員名|■■■):\s*([一-龯ひ-んァ-ヶ■]{2,4})', text)
        has_name = name_match is not None
        
        # 社員コードの検索
        has_code = bool(re.search(code_pattern, text))
        
        # 社員名と社員コードの両方が必要
        return has_name and has_code
    
    def _check_attendance_data(self, text: str) -> bool:
        """勤怠日ごとの出退勤情報が含まれているかチェック"""
        # 出勤・退勤の時間パターンを検索
        time_pattern = r'\d{1,2}:\d{2}'
        date_pattern = r'\d{1,2}/\d{1,2}'
        
        has_time = bool(re.search(time_pattern, text))
        has_date = bool(re.search(date_pattern, text))
        
        # 時間と日付の両方が必要
        return has_time and has_date
    
    def _check_footer_approval(self, text: str) -> bool:
        """フッターに承認欄があるかチェック"""
        approval_keywords = ['承認', '承認欄', '承認者', 'approval', '承認欄:', '■■■:']
        return any(keyword in text for keyword in approval_keywords)
    
    def _check_footer_page_number(self, text: str) -> bool:
        """フッターにページ番号があるかチェック"""
        page_patterns = [r'ページ\s*\d+', r'Page\s*\d+', r'\d+\s*/\s*\d+']
        return any(re.search(pattern, text) for pattern in page_patterns)
    
    def _check_no_data_message(self, text: str) -> bool:
        """データなしメッセージがあるかチェック"""
        no_data_keywords = ['データなし', 'データがありません', 'No data', '■■■■■']
        return any(keyword in text for keyword in no_data_keywords)


class PDFGenerator:
    """テスト用PDF生成クラス"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
    
    def generate_valid_pdf(self, output_path: str, year_month: str = "2025-01") -> str:
        """正常なPDFを生成"""
        doc = SimpleDocTemplate(output_path, pagesize=A4)
        story = []
        
        # ヘッダー
        header_style = ParagraphStyle(
            'CustomHeader',
            parent=self.styles['Heading1'],
            fontSize=16,
            alignment=1,  # 中央揃え
            spaceAfter=20
        )
        story.append(Paragraph("KintaiSystem", header_style))
        
        # 対象年月
        story.append(Paragraph(f"対象年月: {year_month}", self.styles['Normal']))
        story.append(Spacer(1, 12))
        
        # 社員情報
        story.append(Paragraph("社員名: 田中太郎", self.styles['Normal']))
        story.append(Paragraph("社員コード: EMP001", self.styles['Normal']))
        story.append(Spacer(1, 12))
        
        # 勤怠データテーブル
        data = [
            ['日付', '出勤時間', '退勤時間', '勤務時間'],
            ['01/01', '09:00', '18:00', '8:00'],
            ['01/02', '09:15', '18:15', '8:00'],
            ['01/03', '09:00', '17:30', '8:30']
        ]
        
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(table)
        story.append(Spacer(1, 20))
        
        # フッター
        story.append(Paragraph("承認欄: _________________", self.styles['Normal']))
        story.append(Paragraph("ページ: 1/1", self.styles['Normal']))
        
        doc.build(story)
        return output_path
    
    def generate_no_data_pdf(self, output_path: str, year_month: str = "2025-01") -> str:
        """データなしPDFを生成"""
        doc = SimpleDocTemplate(output_path, pagesize=A4)
        story = []
        
        # ヘッダー
        header_style = ParagraphStyle(
            'CustomHeader',
            parent=self.styles['Heading1'],
            fontSize=16,
            alignment=1,
            spaceAfter=20
        )
        story.append(Paragraph("KintaiSystem", header_style))
        
        # 対象年月
        story.append(Paragraph(f"対象年月: {year_month}", self.styles['Normal']))
        story.append(Spacer(1, 12))
        
        # データなしメッセージ
        story.append(Paragraph("データなし", self.styles['Normal']))
        story.append(Spacer(1, 20))
        
        # フッター
        story.append(Paragraph("承認欄: _________________", self.styles['Normal']))
        story.append(Paragraph("ページ: 1/1", self.styles['Normal']))
        
        doc.build(story)
        return output_path
    
    def generate_invalid_format_pdf(self, output_path: str) -> str:
        """フォーマット異常PDFを生成（年月が"202509"形式）"""
        doc = SimpleDocTemplate(output_path, pagesize=A4)
        story = []
        
        # ヘッダー
        header_style = ParagraphStyle(
            'CustomHeader',
            parent=self.styles['Heading1'],
            fontSize=16,
            alignment=1,
            spaceAfter=20
        )
        story.append(Paragraph("KintaiSystem", header_style))
        
        # 対象年月（異常フォーマット）
        story.append(Paragraph("対象年月: 202509", self.styles['Normal']))
        story.append(Spacer(1, 12))
        
        # 社員情報
        story.append(Paragraph("社員名: 田中太郎", self.styles['Normal']))
        story.append(Paragraph("社員コード: EMP001", self.styles['Normal']))
        story.append(Spacer(1, 20))
        
        # フッター
        story.append(Paragraph("承認欄: _________________", self.styles['Normal']))
        story.append(Paragraph("ページ: 1/1", self.styles['Normal']))
        
        doc.build(story)
        return output_path
    
    def generate_missing_header_pdf(self, output_path: str) -> str:
        """ヘッダー欠落PDFを生成"""
        doc = SimpleDocTemplate(output_path, pagesize=A4)
        story = []
        
        # ヘッダーなし（KintaiSystemが含まれていない）
        story.append(Paragraph("勤怠レポート", self.styles['Heading1']))
        story.append(Paragraph("対象年月: 2025-01", self.styles['Normal']))
        story.append(Spacer(1, 20))
        
        # フッター
        story.append(Paragraph("承認欄: _________________", self.styles['Normal']))
        story.append(Paragraph("ページ: 1/1", self.styles['Normal']))
        
        doc.build(story)
        return output_path
    
    def generate_missing_footer_pdf(self, output_path: str) -> str:
        """フッター欠落PDFを生成"""
        doc = SimpleDocTemplate(output_path, pagesize=A4)
        story = []
        
        # ヘッダー
        header_style = ParagraphStyle(
            'CustomHeader',
            parent=self.styles['Heading1'],
            fontSize=16,
            alignment=1,
            spaceAfter=20
        )
        story.append(Paragraph("KintaiSystem", header_style))
        
        # 対象年月
        story.append(Paragraph("対象年月: 2025-01", self.styles['Normal']))
        story.append(Spacer(1, 12))
        
        # 社員情報
        story.append(Paragraph("社員名: 田中太郎", self.styles['Normal']))
        story.append(Paragraph("社員コード: EMP001", self.styles['Normal']))
        
        # フッターなし（承認欄・ページ番号なし）
        
        doc.build(story)
        return output_path


def main():
    """メイン実行関数"""
    print("=== PDF検証ツール ===")
    
    # PDF生成器と検証器を初期化
    generator = PDFGenerator()
    validator = PDFValidator()
    
    # テスト用PDFファイルを生成
    test_files = {
        'valid': generator.generate_valid_pdf('test_valid.pdf'),
        'no_data': generator.generate_no_data_pdf('test_no_data.pdf'),
        'invalid_format': generator.generate_invalid_format_pdf('test_invalid_format.pdf'),
        'missing_header': generator.generate_missing_header_pdf('test_missing_header.pdf'),
        'missing_footer': generator.generate_missing_footer_pdf('test_missing_footer.pdf')
    }
    
    print("テスト用PDFファイルを生成しました:")
    for test_type, file_path in test_files.items():
        print(f"  {test_type}: {file_path}")
    
    print("\n=== 検証実行 ===")
    
    # 各PDFファイルを検証
    for test_type, file_path in test_files.items():
        print(f"\n--- {test_type} ---")
        results = validator.validate_pdf(file_path, debug=False)
        
        if 'error' in results:
            print(f"エラー: {results['error']}")
            continue
        
        print(f"ヘッダー(KintaiSystem): {'✓' if results['header_kintai_system'] else '✗'}")
        print(f"年月フォーマット: {'✓' if results['year_month_format'] else '✗'}")
        print(f"社員情報: {'✓' if results['employee_info'] else '✗'}")
        print(f"勤怠データ: {'✓' if results['attendance_data'] else '✗'}")
        print(f"データなしメッセージ: {'✓' if results['no_data_message'] else '✗'}")
        print(f"承認欄: {'✓' if results['footer_approval'] else '✗'}")
        print(f"ページ番号: {'✓' if results['footer_page_number'] else '✗'}")
        print(f"全体判定: {'✓ 合格' if results['overall_pass'] else '✗ 不合格'}")
    
    print("\n=== 検証完了 ===")


if __name__ == "__main__":
    main()
