"""
uploaders/instagram_facebook.py - Upload de Reels no Instagram e Facebook simultaneamente via instagrapi (Zero Aprovação).
"""

from pathlib import Path
from typing import Dict, Any, Optional
import json

from uploaders.base import BaseUploader
from config import SESSIONS_DIR

class InstagramFacebookUploader(BaseUploader):
    def __init__(self):
        super().__init__("instagram_facebook")
        self.session_file = SESSIONS_DIR / "instagram_session.json"
        self.cookie_file = SESSIONS_DIR / "instagram_cookies.json"

    def upload(
        self, 
        video_path: str, 
        caption: str, 
        title: Optional[str] = None, 
        link: Optional[str] = None,
        share_to_facebook: bool = True,
        **kwargs
    ) -> Dict[str, Any]:
        path = self.validate_file(video_path)

        try:
            from instagrapi import Client
        except ImportError:
            return {
                "success": False,
                "platform": "instagram_reels",
                "error": "Biblioteca instagrapi não encontrada. Instale com: pip install instagrapi"
            }

        cl = Client()

        # Tenta carregar a sessão salva
        logged_in = False
        if self.session_file.exists():
            try:
                cl.load_settings(str(self.session_file))
                logged_in = True
                print(f"[INSTAGRAM/FB] Sessão carregada de {self.session_file.name}")
            except Exception as e:
                print(f"[INSTAGRAM/FB] Aviso ao carregar sessão: {e}")

        # Se não carregou por settings, tenta pelo cookie sessionid
        if not logged_in and self.cookie_file.exists():
            try:
                with open(self.cookie_file, "r", encoding="utf-8") as f:
                    cookies = json.load(f)
                    session_id = next((c["value"] for c in cookies if c.get("name") == "sessionid"), None)
                    if session_id:
                        cl.login_by_sessionid(session_id)
                        cl.dump_settings(str(self.session_file))
                        logged_in = True
                        print(f"[INSTAGRAM/FB] Login realizado via sessionid do cookie!")
            except Exception as e:
                print(f"[INSTAGRAM/FB] Falha ao logar via sessionid: {e}")

        if not logged_in:
            return {
                "success": False,
                "platform": "instagram_reels",
                "error": "Sessão do Instagram não configurada. Execute: python auth_manager.py --network instagram"
            }

        print(f"[INSTAGRAM/FB] Iniciando upload de Reel: {path.name}...")
        print(f"[INSTAGRAM/FB] Cross-posting no Facebook Reels ativado: {share_to_facebook}")

        try:
            media = cl.clip_upload(
                path=path,
                caption=caption,
                share_to_fb=share_to_facebook
            )
            media_id = getattr(media, "id", None)
            media_code = getattr(media, "code", None)
            post_url = f"https://www.instagram.com/reel/{media_code}/" if media_code else None

            print(f"[INSTAGRAM/FB] ✅ Sucesso! Reel publicado no Instagram e Facebook!")
            if post_url:
                print(f"[INSTAGRAM/FB] Link do Reel: {post_url}")

            return {
                "success": True,
                "platform": "instagram_facebook",
                "post_url": post_url,
                "media_id": media_id,
                "shared_to_facebook": share_to_facebook,
                "error": None
            }

        except Exception as e:
            return {
                "success": False,
                "platform": "instagram_facebook",
                "error": f"Erro no upload do Reel: {str(e)}"
            }
