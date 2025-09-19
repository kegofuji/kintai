import os
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List

logger = logging.getLogger(__name__)

class FileManager:
    """ファイル管理サービス"""
    
    def __init__(self, tmp_dir: str = "tmp"):
        self.tmp_dir = tmp_dir
        self._ensure_tmp_directory()
    
    def _ensure_tmp_directory(self):
        """一時ディレクトリが存在することを確認"""
        if not os.path.exists(self.tmp_dir):
            os.makedirs(self.tmp_dir)
            logger.info(f"一時ディレクトリを作成しました: {self.tmp_dir}")
    
    async def cleanup_old_files(self, max_age_hours: int = 24):
        """
        古いファイルをクリーンアップする
        
        Args:
            max_age_hours: 最大保持時間（時間）
        """
        try:
            current_time = datetime.now()
            max_age = timedelta(hours=max_age_hours)
            deleted_count = 0
            
            for filename in os.listdir(self.tmp_dir):
                filepath = os.path.join(self.tmp_dir, filename)
                
                if os.path.isfile(filepath):
                    file_time = datetime.fromtimestamp(os.path.getctime(filepath))
                    
                    if current_time - file_time > max_age:
                        os.remove(filepath)
                        deleted_count += 1
                        logger.info(f"古いファイルを削除しました: {filename}")
            
            if deleted_count > 0:
                logger.info(f"クリーンアップ完了: {deleted_count}個のファイルを削除しました")
                
        except Exception as e:
            logger.error(f"ファイルクリーンアップエラー: {str(e)}")
    
    def get_file_path(self, filename: str) -> str:
        """
        ファイルの完全パスを取得する
        
        Args:
            filename: ファイル名
        
        Returns:
            str: ファイルの完全パス
        """
        return os.path.join(self.tmp_dir, filename)
    
    def file_exists(self, filename: str) -> bool:
        """
        ファイルが存在するかチェックする
        
        Args:
            filename: ファイル名
        
        Returns:
            bool: ファイルが存在する場合True
        """
        filepath = self.get_file_path(filename)
        return os.path.exists(filepath)
    
    def delete_file(self, filename: str) -> bool:
        """
        ファイルを削除する
        
        Args:
            filename: ファイル名
        
        Returns:
            bool: 削除に成功した場合True
        """
        try:
            filepath = self.get_file_path(filename)
            if os.path.exists(filepath):
                os.remove(filepath)
                logger.info(f"ファイルを削除しました: {filename}")
                return True
            return False
        except Exception as e:
            logger.error(f"ファイル削除エラー: {str(e)}")
            return False
    
    def list_files(self) -> List[str]:
        """
        一時ディレクトリ内のファイル一覧を取得する
        
        Returns:
            List[str]: ファイル名のリスト
        """
        try:
            return [f for f in os.listdir(self.tmp_dir) if os.path.isfile(os.path.join(self.tmp_dir, f))]
        except Exception as e:
            logger.error(f"ファイル一覧取得エラー: {str(e)}")
            return []
