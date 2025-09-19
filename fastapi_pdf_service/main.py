from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import uvicorn
import os
import asyncio
from datetime import datetime, timedelta
from typing import Optional
import logging

from services.pdf_generator import PDFGenerator
from services.file_manager import FileManager
from models.report_request import ReportRequest
from models.report_response import ReportResponse

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PDF Report Service",
    description="勤怠レポートPDF生成マイクロサービス",
    version="1.0.0"
)

# 認証設定
API_KEY = os.getenv("API_KEY", "test-key")
REQUIRE_AUTH = os.getenv("REQUIRE_AUTH", "false").lower() == "true"
security = HTTPBearer(auto_error=False)

# サービス初期化
pdf_generator = PDFGenerator()
file_manager = FileManager()

# バックグラウンドタスク用のタスクセット
background_tasks = set()

def verify_api_key(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """APIキー認証（開発環境ではバイパス可能）"""
    if not REQUIRE_AUTH:
        logger.info("認証をバイパスします（開発環境）")
        return True
    
    if not credentials:
        raise HTTPException(status_code=401, detail="認証が必要です")
    
    if credentials.credentials != API_KEY:
        raise HTTPException(status_code=401, detail="無効なAPIキーです")
    
    logger.info("認証成功")
    return True


@app.on_event("startup")
async def startup_event():
    """アプリケーション起動時の処理"""
    # 一時ファイルディレクトリを作成
    os.makedirs("tmp", exist_ok=True)
    logger.info("PDF Report Service started")

@app.on_event("shutdown")
async def shutdown_event():
    """アプリケーション終了時の処理"""
    # バックグラウンドタスクをキャンセル
    for task in background_tasks:
        task.cancel()
    logger.info("PDF Report Service stopped")

@app.post("/reports/pdf", response_model=ReportResponse)
async def generate_pdf_report(request: ReportRequest, _: bool = Depends(verify_api_key)):
    """
    勤怠レポートPDFを生成する
    
    Args:
        request: レポート生成リクエスト（employeeId, yearMonth）
    
    Returns:
        ReportResponse: 生成されたPDFのURL
    """
    try:
        logger.info(f"PDF生成リクエスト受信: employeeId={request.employeeId}, yearMonth={request.yearMonth}")
        
        # 年月フォーマットの検証
        if not validate_year_month_format(request.yearMonth):
            raise HTTPException(status_code=400, detail="年月フォーマットが不正です。yyyy-MM形式で入力してください。")
        
        # PDFファイル名を生成
        filename = f"report_{request.employeeId}_{request.yearMonth.replace('-', '')}.pdf"
        filepath = os.path.join("tmp", filename)
        
        # PDFを生成
        await pdf_generator.generate_attendance_report(
            employee_id=request.employeeId,
            year_month=request.yearMonth,
            output_path=filepath
        )
        
        # 24時間後の削除タスクをスケジュール
        delete_task = asyncio.create_task(
            schedule_file_deletion(filepath, 24 * 60 * 60)  # 24時間後
        )
        background_tasks.add(delete_task)
        delete_task.add_done_callback(background_tasks.discard)
        
        # URLを生成
        pdf_port = os.getenv("PDF_PORT", "8081")
        url = f"http://localhost:{pdf_port}/reports/tmp/{filename}"
        
        logger.info(f"PDF生成完了: {url}")
        return ReportResponse(url=url)
        
    except ValueError as e:
        logger.error(f"バリデーションエラー: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        logger.error(f"ファイルが見つかりません: {str(e)}")
        raise HTTPException(status_code=404, detail="従業員データが見つかりません")
    except Exception as e:
        logger.error(f"PDF生成エラー: {str(e)}")
        raise HTTPException(status_code=500, detail="PDF生成に失敗しました")

@app.get("/reports/tmp/{filename}")
async def get_pdf_file(filename: str):
    """
    生成されたPDFファイルを取得する
    
    Args:
        filename: PDFファイル名
    
    Returns:
        FileResponse: PDFファイル
    """
    filepath = os.path.join("tmp", filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="ファイルが見つかりません")
    
    return FileResponse(
        path=filepath,
        media_type="application/pdf",
        filename=filename
    )

@app.delete("/reports/tmp/{filename}")
async def delete_pdf_file(filename: str):
    """
    指定されたPDFファイルを削除する
    
    Args:
        filename: PDFファイル名
    
    Returns:
        dict: 削除結果
    """
    filepath = os.path.join("tmp", filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="ファイルが見つかりません")
    
    try:
        os.remove(filepath)
        logger.info(f"ファイル削除完了: {filename}")
        return {"message": f"ファイル {filename} を削除しました"}
    except Exception as e:
        logger.error(f"ファイル削除エラー: {str(e)}")
        raise HTTPException(status_code=500, detail="ファイル削除に失敗しました")

@app.get("/health")
async def health_check():
    """ヘルスチェックエンドポイント"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

def validate_year_month_format(year_month: str) -> bool:
    """
    年月フォーマットを検証する
    
    Args:
        year_month: 年月文字列（yyyy-MM形式）
    
    Returns:
        bool: フォーマットが正しい場合True
    """
    try:
        datetime.strptime(year_month, "%Y-%m")
        return True
    except ValueError:
        return False

async def schedule_file_deletion(filepath: str, delay_seconds: int):
    """
    指定された時間後にファイルを削除する
    
    Args:
        filepath: 削除するファイルのパス
        delay_seconds: 削除までの遅延時間（秒）
    """
    try:
        await asyncio.sleep(delay_seconds)
        if os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f"スケジュール削除完了: {filepath}")
    except Exception as e:
        logger.error(f"スケジュール削除エラー: {str(e)}")

if __name__ == "__main__":
    port = int(os.getenv("PDF_PORT", "8081"))
    uvicorn.run(app, host="0.0.0.0", port=port)
