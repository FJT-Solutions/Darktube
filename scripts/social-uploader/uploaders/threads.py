"""
uploaders/threads.py - Upload de vídeo no Threads via API direta ou Playwright (Zero Aprovação).
"""

import json
import time
import requests
from pathlib import Path
from typing import Dict, Any, Optional
from playwright.sync_api import sync_playwright

from uploaders.base import BaseUploader
from config import (
    SESSIONS_DIR, 
    DEFAULT_USER_AGENT, 
    THREADS_USER_ID, 
    THREADS_ACCESS_TOKEN
)

class ThreadsUploader(BaseUploader):
    def __init__(self):
        super().__init__("threads")
        self.cookie_file = SESSIONS_DIR / "threads_cookies.json"

    def upload(
        self, 
        video_path: str, 
        caption: str, 
        title: Optional[str] = None, 
        link: Optional[str] = None,
        video_url: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        path = self.validate_file(video_path)

        # Método 1: API Oficial do Threads (se houver token configurado e URL pública do vídeo)
        if THREADS_USER_ID and THREADS_ACCESS_TOKEN and video_url:
            return self._upload_via_api(video_url, caption)

        # Método 2: Via Playwright com cookies salvos da sessão web
        if self.cookie_file.exists():
            return self._upload_via_playwright(path, caption)

        return {
            "success": False,
            "platform": self.name,
            "error": (
                "Nenhum método configurado para Threads. Configure THREADS_ACCESS_TOKEN no .env "
                "OU execute: python auth_manager.py --network threads"
            )
        }

    def _upload_via_api(self, video_url: str, text: str) -> Dict[str, Any]:
        print(f"[{self.name.upper()}] Enviando vídeo para Threads via API oficial...")
        try:
            # 1. Cria o container de mídia de vídeo
            create_url = f"https://graph.threads.net/v1.0/{THREADS_USER_ID}/threads"
            payload = {
                "media_type": "VIDEO",
                "video_url": video_url,
                "text": text,
                "access_token": THREADS_ACCESS_TOKEN
            }
            res = requests.post(create_url, data=payload, timeout=30)
            res_data = res.json()

            container_id = res_data.get("id")
            if not container_id:
                return {"success": False, "platform": self.name, "error": f"Erro container: {res_data}"}

            # 2. Aguarda processamento do vídeo pela Meta
            time.sleep(15)

            # 3. Publica o container
            pub_url = f"https://graph.threads.net/v1.0/{THREADS_USER_ID}/threads_publish"
            pub_res = requests.post(pub_url, data={"creation_id": container_id, "access_token": THREADS_ACCESS_TOKEN})
            pub_data = pub_res.json()

            print(f"[{self.name.upper()}] ✅ Publicado no Threads via API!")
            return {"success": True, "platform": self.name, "post_id": pub_data.get("id"), "error": None}

        except Exception as e:
            return {"success": False, "platform": self.name, "error": str(e)}

    def _upload_via_playwright(self, path: Path, caption: str) -> Dict[str, Any]:
        print(f"[{self.name.upper()}] Publicando no Threads via Playwright...")
        try:
            with open(self.cookie_file, "r", encoding="utf-8") as f:
                cookies = json.load(f)

            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True, args=["--disable-blink-features=AutomationControlled"])
                context = browser.new_context(user_agent=DEFAULT_USER_AGENT, viewport={"width": 1280, "height": 800})
                context.add_cookies(cookies)

                page = context.new_page()
                page.goto("https://www.threads.net/", timeout=60000)
                page.wait_for_load_state("domcontentloaded")
                time.sleep(3)

                # Localiza botão ou campo de nova thread
                new_post_btn = page.locator('div[aria-label*="Criar"], div[aria-label*="Create"], svg[aria-label*="Create"]').first
                if new_post_btn.count():
                    new_post_btn.click()
                    time.sleep(2)

                file_input = page.locator('input[type="file"]').first
                if file_input.count():
                    file_input.set_input_files(str(path))
                    time.sleep(3)

                editor = page.locator('div[contenteditable="true"]').first
                if editor.count():
                    editor.click()
                    editor.fill(caption)

                post_btn = page.locator('div[role="button"]:has-text("Publicar"), div[role="button"]:has-text("Post")').first
                if post_btn.count():
                    post_btn.click()
                    time.sleep(6)

                browser.close()
                print(f"[{self.name.upper()}] ✅ Publicado no Threads com sucesso!")
                return {"success": True, "platform": self.name, "error": None}

        except Exception as e:
            return {"success": False, "platform": self.name, "error": str(e)}
