#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
勤怠管理システム - PDF成果物生成API
Flaskを使用してPDFダウンロード機能を提供
"""

from flask import Flask, send_file, jsonify, request
from pdf_generator import PDFGenerator
import os
import tempfile
from datetime import datetime

app = Flask(__name__)
pdf_generator = PDFGenerator()

# 利用可能なPDFタイプ
PDF_TYPES = {
    'validation-checklist': {
        'name': 'バリデーションチェックリスト',
        'filename': 'validation_checklist.pdf',
        'generator': pdf_generator.generate_validation_checklist
    },
    'test-specification': {
        'name': 'テスト仕様書',
        'filename': 'test_specification.pdf',
        'generator': pdf_generator.generate_test_specification
    },
    'test-report': {
        'name': 'テスト結果レポート',
        'filename': 'test_report.pdf',
        'generator': pdf_generator.generate_test_report
    },
    'user-manual': {
        'name': '利用手順書',
        'filename': 'user_manual.pdf',
        'generator': pdf_generator.generate_user_manual
    }
}


@app.route('/')
def index():
    """APIの概要を表示"""
    return jsonify({
        'message': '勤怠管理システム - PDF成果物生成API',
        'version': '1.0.0',
        'available_endpoints': {
            'GET /api/docs/{type}': 'PDFダウンロード',
            'GET /api/docs/list': '利用可能なPDF一覧',
            'GET /health': 'ヘルスチェック'
        },
        'available_pdf_types': list(PDF_TYPES.keys())
    })


@app.route('/api/docs/list')
def list_pdfs():
    """利用可能なPDF一覧を取得"""
    return jsonify({
        'available_pdfs': [
            {
                'type': pdf_type,
                'name': info['name'],
                'filename': info['filename'],
                'download_url': f'/api/docs/{pdf_type}'
            }
            for pdf_type, info in PDF_TYPES.items()
        ]
    })


@app.route('/api/docs/<pdf_type>')
def download_pdf(pdf_type):
    """指定されたPDFをダウンロード"""
    if pdf_type not in PDF_TYPES:
        return jsonify({
            'error': 'Invalid PDF type',
            'available_types': list(PDF_TYPES.keys())
        }), 400
    
    try:
        # 一時ファイルにPDFを生成
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            pdf_info = PDF_TYPES[pdf_type]
            pdf_filename = pdf_info['generator'](tmp_file.name)
            
            # ファイルを読み込んで送信
            return send_file(
                pdf_filename,
                as_attachment=True,
                download_name=pdf_info['filename'],
                mimetype='application/pdf'
            )
    
    except Exception as e:
        return jsonify({
            'error': 'PDF generation failed',
            'message': str(e)
        }), 500


@app.route('/api/docs/generate-all')
def generate_all_pdfs():
    """すべてのPDFを一括生成"""
    try:
        results = []
        
        for pdf_type, info in PDF_TYPES.items():
            try:
                # 一時ファイルにPDFを生成
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                    pdf_filename = info['generator'](tmp_file.name)
                    results.append({
                        'type': pdf_type,
                        'name': info['name'],
                        'filename': pdf_filename,
                        'status': 'success',
                        'size': os.path.getsize(pdf_filename) if os.path.exists(pdf_filename) else 0
                    })
            except Exception as e:
                results.append({
                    'type': pdf_type,
                    'name': info['name'],
                    'status': 'error',
                    'error': str(e)
                })
        
        return jsonify({
            'message': 'PDF generation completed',
            'results': results,
            'generated_at': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({
            'error': 'Batch PDF generation failed',
            'message': str(e)
        }), 500


@app.route('/health')
def health_check():
    """ヘルスチェック"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'PDF Generation API'
    })


@app.errorhandler(404)
def not_found(error):
    """404エラーハンドラー"""
    return jsonify({
        'error': 'Not Found',
        'message': 'The requested resource was not found',
        'available_endpoints': [
            'GET /',
            'GET /api/docs/list',
            'GET /api/docs/{type}',
            'GET /api/docs/generate-all',
            'GET /health'
        ]
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """500エラーハンドラー"""
    return jsonify({
        'error': 'Internal Server Error',
        'message': 'An unexpected error occurred'
    }), 500


if __name__ == '__main__':
    print("勤怠管理システム - PDF成果物生成API を起動中...")
    print("利用可能なエンドポイント:")
    print("  GET /                    - API概要")
    print("  GET /api/docs/list       - PDF一覧")
    print("  GET /api/docs/{type}     - PDFダウンロード")
    print("  GET /api/docs/generate-all - 全PDF一括生成")
    print("  GET /health              - ヘルスチェック")
    print("\n利用可能なPDFタイプ:")
    for pdf_type, info in PDF_TYPES.items():
        print(f"  {pdf_type} - {info['name']}")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
