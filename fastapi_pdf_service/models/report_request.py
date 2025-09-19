from pydantic import BaseModel, Field, validator
from typing import Optional
import re

class ReportRequest(BaseModel):
    """勤怠レポート生成リクエスト"""
    
    employeeId: int = Field(..., description="従業員ID", gt=0)
    yearMonth: str = Field(..., description="年月（yyyy-MM形式）", min_length=7, max_length=7)
    
    @validator('yearMonth')
    def validate_year_month(cls, v):
        """年月フォーマットを検証"""
        if not re.match(r'^\d{4}-\d{2}$', v):
            raise ValueError('年月はyyyy-MM形式で入力してください')
        
        # 月の範囲をチェック
        month = int(v.split('-')[1])
        if month < 1 or month > 12:
            raise ValueError('月は01-12の範囲で入力してください')
        
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "employeeId": 2,
                "yearMonth": "2025-09"
            }
        }
