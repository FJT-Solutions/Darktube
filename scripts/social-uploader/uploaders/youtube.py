"""
uploaders/youtube.py - Upload de Shorts no YouTube via Google API v3 (Modo Teste, Zero Aprovação).
"""

from pathlib import Path
from typing import Dict, Any, Optional
import os
import json

from uploaders.base import BaseUploader
from config import (
    SESSIONS_DIR, 
    YOUTUBE_CLIENT_SECRETS_FILE, 
    YOUTUBE_CREDENTIALS_FILE,
    DEFAULT_USER_AGENT
)

class YouTubeUploader(BaseUploader):
    def __init__(self, cookie_file=None):
        super().__init__("youtube_shorts")
        self.credentials_file = Path(YOUTUBE_CREDENTIALS_FILE)
        self.cookie_file = Path(cookie_file) if cookie_file else SESSIONS_DIR / "youtube_cookies.json"

    def upload(
        self, 
        video_path: str, 
        caption: str, 
        title: Optional[str] = None, 
        link: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        path = self.validate_file(video_path)

        # Garante que o título e a descrição incluam a tag #Shorts
        video_title = title or caption[:90]
        if "#shorts" not in video_title.lower() and "#short" not in video_title.lower():
            video_title = f"{video_title} #shorts"

        video_description = f"{caption}\n\n{link or ''}\n\n#shorts #viral #darktube"

        # Tentativa 1: Via Google API v3 (Oficial, Modo Teste, mais rápido e estável)
        if self.credentials_file.exists():
            return self._upload_via_api(path, video_title, video_description)

        return {
            "success": False,
            "platform": self.name,
            "error": (
                f"Credenciais do YouTube não encontradas em {self.credentials_file}. "
                "Execute: python auth_manager.py --network youtube"
            )
        }

    def _upload_via_api(self, path: Path, title: str, description: str) -> Dict[str, Any]:
        try:
            from google.oauth2.credentials import Credentials
            from googleapiclient.discovery import build
            from googleapiclient.http import MediaFileUpload

            with open(self.credentials_file, "r", encoding="utf-8") as f:
                creds_data = json.load(f)

            credentials = Credentials.from_authorized_user_info(creds_data)
            youtube = build("youtube", "v3", credentials=credentials)

            print(f"[{self.name.upper()}] Enviando Shorts para o YouTube via API v3...")

            body = {
                "snippet": {
                    "title": title[:100],
                    "description": description,
                    "tags": ["shorts", "viral", "darktube", "reels"],
                    "categoryId": "22"  # Pessoas e Blogs
                },
                "status": {
                    "privacyStatus": "public",
                    "selfDeclaredMadeForKids": False
                }
            }

            media = MediaFileUpload(
                str(path), 
                mimetype="video/mp4", 
                resumable=True, 
                chunksize=1024*1024*5
            )

            request = youtube.videos().insert(
                part="snippet,status",
                body=body,
                media_body=media
            )

            response = None
            while response is None:
                status, response = request.next_chunk()
                if status:
                    print(f"[{self.name.upper()}] Progresso: {int(status.progress() * 100)}%")

            video_id = response.get("id")
            video_url = f"https://youtube.com/shorts/{video_id}"

            print(f"[{self.name.upper()}] ✅ Sucesso! Short publicado: {video_url}")

            return {
                "success": True,
                "platform": self.name,
                "post_url": video_url,
                "video_id": video_id,
                "error": None
            }

        except Exception as e:
            return {
                "success": False,
                "platform": self.name,
                "error": f"Erro na API do YouTube: {str(e)}"
            }
