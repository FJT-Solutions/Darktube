"""
uploaders/telegram.py - Envio de vídeo direto para Canal VIP / Comunidade via Telegram Bot API (Zero Aprovação).
"""

import requests
from pathlib import Path
from typing import Dict, Any, Optional

from uploaders.base import BaseUploader
from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

class TelegramUploader(BaseUploader):
    def __init__(self):
        super().__init__("telegram")

    def upload(
        self, 
        video_path: str, 
        caption: str, 
        title: Optional[str] = None, 
        link: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        path = self.validate_file(video_path)

        bot_token = kwargs.get("telegram_token") or TELEGRAM_BOT_TOKEN
        chat_id = kwargs.get("telegram_chat_id") or TELEGRAM_CHAT_ID

        if not bot_token or not chat_id:
            return {
                "success": False,
                "platform": self.name,
                "error": "TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID devem estar configurados no .env"
            }

        url = f"https://api.telegram.org/bot{bot_token}/sendVideo"
        formatted_caption = f"🎬 <b>{title or 'Novo Clipe DarkTube'}</b>\n\n{caption}\n\n🔗 {link or ''}"

        print(f"[{self.name.upper()}] Enviando vídeo para o canal/grupo {chat_id}...")

        try:
            with open(path, "rb") as video_file:
                payload = {
                    "chat_id": chat_id,
                    "caption": formatted_caption[:1024],
                    "parse_mode": "HTML",
                    "supports_streaming": True
                }
                files = {
                    "video": (path.name, video_file, "video/mp4")
                }
                response = requests.post(url, data=payload, files=files, timeout=120)
                data = response.json()

            if data.get("ok"):
                message_id = data["result"]["message_id"]
                print(f"[{self.name.upper()}] ✅ Sucesso! Vídeo entregue no Telegram (Msg ID: {message_id})")
                return {
                    "success": True,
                    "platform": self.name,
                    "message_id": message_id,
                    "error": None
                }
            else:
                return {
                    "success": False,
                    "platform": self.name,
                    "error": data.get("description", "Erro desconhecido da Telegram API")
                }

        except Exception as e:
            return {
                "success": False,
                "platform": self.name,
                "error": str(e)
            }
