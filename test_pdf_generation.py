#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDF生成機能のテストスクリプト
"""

import requests
import os
import time
from pdf_generator import PDFGenerator


def test_pdf_generation():
    """PDF生成機能をテスト"""
    print("=== PDF生成機能テスト ===")
    
    # PDFGeneratorの直接テスト
    generator = PDFGenerator()
    
    print("1. バリデーションチェックリスト生成テスト...")
    try:
        filename = generator.generate_validation_checklist("test_validation.pdf")
        if os.path.exists(filename):
            size = os.path.getsize(filename)
            print(f"   ✓ 成功: {filename} ({size} bytes)")
        else:
            print("   ✗ 失敗: ファイルが生成されませんでした")
    except Exception as e:
        print(f"   ✗ エラー: {e}")
    
    print("2. テスト仕様書生成テスト...")
    try:
        filename = generator.generate_test_specification("test_spec.pdf")
        if os.path.exists(filename):
            size = os.path.getsize(filename)
            print(f"   ✓ 成功: {filename} ({size} bytes)")
        else:
            print("   ✗ 失敗: ファイルが生成されませんでした")
    except Exception as e:
        print(f"   ✗ エラー: {e}")
    
    print("3. テスト結果レポート生成テスト...")
    try:
        filename = generator.generate_test_report("test_report.pdf")
        if os.path.exists(filename):
            size = os.path.getsize(filename)
            print(f"   ✓ 成功: {filename} ({size} bytes)")
        else:
            print("   ✗ 失敗: ファイルが生成されませんでした")
    except Exception as e:
        print(f"   ✗ エラー: {e}")
    
    print("4. 利用手順書生成テスト...")
    try:
        filename = generator.generate_user_manual("test_manual.pdf")
        if os.path.exists(filename):
            size = os.path.getsize(filename)
            print(f"   ✓ 成功: {filename} ({size} bytes)")
        else:
            print("   ✗ 失敗: ファイルが生成されませんでした")
    except Exception as e:
        print(f"   ✗ エラー: {e}")


def test_api_endpoints():
    """APIエンドポイントをテスト"""
    print("\n=== APIエンドポイントテスト ===")
    
    base_url = "http://localhost:5000"
    
    # ヘルスチェック
    print("1. ヘルスチェック...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("   ✓ 成功: APIサーバーが稼働中")
        else:
            print(f"   ✗ 失敗: ステータスコード {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"   ✗ エラー: {e}")
        print("   → APIサーバーが起動していない可能性があります")
        return
    
    # PDF一覧取得
    print("2. PDF一覧取得...")
    try:
        response = requests.get(f"{base_url}/api/docs/list", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ 成功: {len(data['available_pdfs'])}個のPDFが利用可能")
            for pdf in data['available_pdfs']:
                print(f"     - {pdf['type']}: {pdf['name']}")
        else:
            print(f"   ✗ 失敗: ステータスコード {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"   ✗ エラー: {e}")
    
    # 各PDFダウンロードテスト
    pdf_types = ['validation-checklist', 'test-specification', 'test-report', 'user-manual']
    
    for pdf_type in pdf_types:
        print(f"3. {pdf_type} ダウンロードテスト...")
        try:
            response = requests.get(f"{base_url}/api/docs/{pdf_type}", timeout=10)
            if response.status_code == 200:
                # ファイルサイズをチェック
                content_length = len(response.content)
                print(f"   ✓ 成功: {content_length} bytes ダウンロード完了")
                
                # テストファイルとして保存
                test_filename = f"test_download_{pdf_type}.pdf"
                with open(test_filename, 'wb') as f:
                    f.write(response.content)
                print(f"     → {test_filename} として保存")
            else:
                print(f"   ✗ 失敗: ステータスコード {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"   ✗ エラー: {e}")


def cleanup_test_files():
    """テストファイルをクリーンアップ"""
    print("\n=== テストファイルクリーンアップ ===")
    
    test_files = [
        "test_validation.pdf",
        "test_spec.pdf", 
        "test_report.pdf",
        "test_manual.pdf",
        "test_download_validation-checklist.pdf",
        "test_download_test-specification.pdf",
        "test_download_test-report.pdf",
        "test_download_user-manual.pdf"
    ]
    
    for filename in test_files:
        if os.path.exists(filename):
            try:
                os.remove(filename)
                print(f"   ✓ 削除: {filename}")
            except Exception as e:
                print(f"   ✗ エラー: {filename} の削除に失敗 - {e}")
        else:
            print(f"   - スキップ: {filename} (存在しません)")


def main():
    """メイン関数"""
    print("勤怠管理システム - PDF生成機能テスト")
    print("=" * 50)
    
    # PDF生成の直接テスト
    test_pdf_generation()
    
    # APIエンドポイントのテスト
    test_api_endpoints()
    
    # クリーンアップ
    cleanup_test_files()
    
    print("\nテスト完了!")


if __name__ == "__main__":
    main()
