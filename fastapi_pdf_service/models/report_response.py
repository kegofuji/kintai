from pydantic import BaseModel, Field
from typing import Optional

class ReportResponse(BaseModel):
    """勤怠レポート生成レスポンス"""
    
    url: str = Field(..., description="生成されたPDFファイルのURL")
    
    class Config:
        schema_extra = {
            "example": {
                "url": "http://localhost:8081/reports/tmp/report_2_202509.pdf"
            }
        }
