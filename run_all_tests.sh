#!/bin/bash

# 勤怠管理システム 全テスト実行スクリプト
# Spring Boot + FastAPI + Vanilla JS SPA の統合テスト

set -e  # エラー時に停止

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 設定
PROJECT_ROOT="/Users/keigofujita/kintai"
SPRING_BOOT_URL="http://localhost:8080"
FASTAPI_URL="http://localhost:8081"

# テスト結果カウンター
TOTAL_TEST_SUITES=0
PASSED_TEST_SUITES=0
FAILED_TEST_SUITES=0

# サーバー起動確認
check_servers() {
    log_info "サーバー起動確認開始..."
    
    local spring_boot_running=false
    local fastapi_running=false
    
    # Spring Bootサーバー確認
    if curl -s -f "$SPRING_BOOT_URL/api/attendance/health" > /dev/null; then
        log_success "Spring Bootサーバー (8080) が起動中"
        spring_boot_running=true
    else
        log_warning "Spring Bootサーバー (8080) に接続できません"
    fi
    
    # FastAPIサーバー確認
    if curl -s -f "$FASTAPI_URL/health" > /dev/null; then
        log_success "FastAPIサーバー (8081) が起動中"
        fastapi_running=true
    else
        log_warning "FastAPIサーバー (8081) に接続できません"
    fi
    
    if [ "$spring_boot_running" = true ] && [ "$fastapi_running" = true ]; then
        log_success "全サーバーが正常に起動中"
        return 0
    else
        log_error "一部のサーバーが起動していません"
        return 1
    fi
}

# 依存関係確認
check_dependencies() {
    log_info "依存関係確認開始..."
    
    local missing_deps=()
    
    # jq確認
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    # Python確認
    if ! command -v python3 &> /dev/null; then
        missing_deps+=("python3")
    fi
    
    # pytest確認
    if ! python3 -c "import pytest" 2>/dev/null; then
        missing_deps+=("pytest")
    fi
    
    # requests確認
    if ! python3 -c "import requests" 2>/dev/null; then
        missing_deps+=("requests")
    fi
    
    # Playwright確認
    if ! command -v npx &> /dev/null; then
        missing_deps+=("npx")
    fi
    
    if [ ${#missing_deps[@]} -eq 0 ]; then
        log_success "全依存関係が利用可能"
        return 0
    else
        log_error "不足している依存関係: ${missing_deps[*]}"
        log_info "インストール方法:"
        for dep in "${missing_deps[@]}"; do
            case $dep in
                "jq")
                    log_info "  macOS: brew install jq"
                    log_info "  Ubuntu: sudo apt-get install jq"
                    ;;
                "python3")
                    log_info "  macOS: brew install python3"
                    log_info "  Ubuntu: sudo apt-get install python3"
                    ;;
                "pytest")
                    log_info "  pip install pytest"
                    ;;
                "requests")
                    log_info "  pip install requests"
                    ;;
                "npx")
                    log_info "  npm install -g npx"
                    ;;
            esac
        done
        return 1
    fi
}

# cURL API統合テスト実行
run_curl_integration_test() {
    log_info "cURL API統合テスト実行開始..."
    
    TOTAL_TEST_SUITES=$((TOTAL_TEST_SUITES + 1))
    
    if [ -f "$PROJECT_ROOT/test_integration.sh" ]; then
        cd "$PROJECT_ROOT"
        if ./test_integration.sh; then
            log_success "cURL API統合テスト成功"
            PASSED_TEST_SUITES=$((PASSED_TEST_SUITES + 1))
        else
            log_error "cURL API統合テスト失敗"
            FAILED_TEST_SUITES=$((FAILED_TEST_SUITES + 1))
        fi
    else
        log_error "test_integration.sh が見つかりません"
        FAILED_TEST_SUITES=$((FAILED_TEST_SUITES + 1))
    fi
}

# pytest統合テスト実行
run_pytest_integration_test() {
    log_info "pytest統合テスト実行開始..."
    
    TOTAL_TEST_SUITES=$((TOTAL_TEST_SUITES + 1))
    
    if [ -f "$PROJECT_ROOT/test_pdf_integration.py" ]; then
        cd "$PROJECT_ROOT"
        if python3 -m pytest test_pdf_integration.py -v --tb=short; then
            log_success "pytest統合テスト成功"
            PASSED_TEST_SUITES=$((PASSED_TEST_SUITES + 1))
        else
            log_error "pytest統合テスト失敗"
            FAILED_TEST_SUITES=$((FAILED_TEST_SUITES + 1))
        fi
    else
        log_error "test_pdf_integration.py が見つかりません"
        FAILED_TEST_SUITES=$((FAILED_TEST_SUITES + 1))
    fi
}

# Playwright UIテスト実行
run_playwright_ui_test() {
    log_info "Playwright UIテスト実行開始..."
    
    TOTAL_TEST_SUITES=$((TOTAL_TEST_SUITES + 1))
    
    if [ -f "$PROJECT_ROOT/test_ui.spec.js" ]; then
        cd "$PROJECT_ROOT"
        
        # Playwrightテスト実行
        if npx playwright test test_ui.spec.js --headed=false; then
            log_success "Playwright UIテスト成功"
            PASSED_TEST_SUITES=$((PASSED_TEST_SUITES + 1))
        else
            log_error "Playwright UIテスト失敗"
            FAILED_TEST_SUITES=$((FAILED_TEST_SUITES + 1))
        fi
    else
        log_error "test_ui.spec.js が見つかりません"
        FAILED_TEST_SUITES=$((FAILED_TEST_SUITES + 1))
    fi
}

# テスト結果サマリー表示
show_test_summary() {
    echo "=========================================="
    log_info "テスト結果サマリー"
    echo "総テストスイート数: $TOTAL_TEST_SUITES"
    echo "成功: $PASSED_TEST_SUITES"
    echo "失敗: $FAILED_TEST_SUITES"
    
    if [ $FAILED_TEST_SUITES -eq 0 ]; then
        log_success "全テストスイートが成功しました！"
        echo ""
        log_info "実行されたテスト:"
        echo "  ✓ cURL API統合テスト"
        echo "  ✓ pytest統合テスト"
        echo "  ✓ Playwright UIテスト"
        return 0
    else
        log_error "$FAILED_TEST_SUITES 個のテストスイートが失敗しました"
        return 1
    fi
}

# メイン実行関数
main() {
    log_info "勤怠管理システム 全テスト実行開始"
    echo "=========================================="
    
    # 依存関係確認
    if ! check_dependencies; then
        log_error "依存関係が不足しています。上記の指示に従ってインストールしてください。"
        exit 1
    fi
    
    # サーバー起動確認
    if ! check_servers; then
        log_warning "サーバーが起動していませんが、テストを継続します"
        log_info "サーバー起動方法:"
        log_info "  Spring Boot: mvn spring-boot:run"
        log_info "  FastAPI: cd fastapi_pdf_service && python -m uvicorn main:app --port 8081"
    fi
    
    # テスト実行
    run_curl_integration_test
    echo ""
    
    run_pytest_integration_test
    echo ""
    
    run_playwright_ui_test
    echo ""
    
    # テスト結果サマリー
    show_test_summary
}

# ヘルプ表示
show_help() {
    echo "勤怠管理システム 全テスト実行スクリプト"
    echo ""
    echo "使用方法:"
    echo "  $0                    # 全テスト実行"
    echo "  $0 --help            # ヘルプ表示"
    echo "  $0 --curl-only       # cURL APIテストのみ実行"
    echo "  $0 --pytest-only     # pytestテストのみ実行"
    echo "  $0 --playwright-only # Playwrightテストのみ実行"
    echo ""
    echo "前提条件:"
    echo "  - Spring Bootサーバー (localhost:8080)"
    echo "  - FastAPIサーバー (localhost:8081)"
    echo "  - jq, python3, pytest, requests, npx"
    echo ""
    echo "テスト内容:"
    echo "  - cURL API統合テスト: API機能の結合テスト"
    echo "  - pytest統合テスト: PDF生成と内容検証"
    echo "  - Playwright UIテスト: フロントエンドSPAテスト"
}

# コマンドライン引数処理
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --curl-only)
        log_info "cURL APIテストのみ実行"
        check_dependencies
        run_curl_integration_test
        show_test_summary
        ;;
    --pytest-only)
        log_info "pytestテストのみ実行"
        check_dependencies
        run_pytest_integration_test
        show_test_summary
        ;;
    --playwright-only)
        log_info "Playwrightテストのみ実行"
        check_dependencies
        run_playwright_ui_test
        show_test_summary
        ;;
    "")
        main
        ;;
    *)
        log_error "不明なオプション: $1"
        show_help
        exit 1
        ;;
esac