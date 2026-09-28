"""
uploaders/kwai.py - Upload no Kwai Creator Center via Playwright (Zero Aprovação).
"""

import json
import time
from pathlib import Path
from typing import Dict, Any, Optional
from playwright.sync_api import sync_playwright

from uploaders.base import BaseUploader
from config import SESSIONS_DIR, DEFAULT_USER_AGENT, DEFAULT_CHROMIUM_ARGS

class KwaiUploader(BaseUploader):
    def __init__(self, cookie_file=None):
        super().__init__("kwai")
        self.cookie_file = Path(cookie_file) if cookie_file else SESSIONS_DIR / "kwai_cookies.json"

    def upload(
        self, 
        video_path: str, 
        caption: str, 
        title: Optional[str] = None, 
        link: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        path = self.validate_file(video_path)

        if not self.cookie_file.exists():
            return {
                "success": False,
                "platform": self.name,
                "error": f"Cookies do Kwai não encontrados em {self.cookie_file}. Execute: python auth_manager.py --network kwai"
            }

        with open(self.cookie_file, "r", encoding="utf-8") as f:
            cookies = json.load(f)

        print(f"[{self.name.upper()}] Iniciando upload no Kwai: {path.name}...")

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(
                    headless=True,
                    args=DEFAULT_CHROMIUM_ARGS
                )
                context = browser.new_context(
                    user_agent=DEFAULT_USER_AGENT,
                    viewport={"width": 1280, "height": 800}
                )
                context.add_cookies(cookies)

                page = context.new_page()
                page.goto("https://creator.kwai.com/", timeout=60000)
                page.wait_for_load_state("domcontentloaded")
                time.sleep(3)

                if "login" in page.url.lower():
                    browser.close()
                    return {
                        "success": False,
                        "platform": self.name,
                        "error": "Sessão do Kwai expirou. Execute: python auth_manager.py --network kwai"
                    }

                file_input = page.locator('input[type="file"]').first
                if not file_input.count():
                    browser.close()
                    return {
                        "success": False,
                        "platform": self.name,
                        "error": "Input de upload do Kwai não encontrado."
                    }

                print(f"[{self.name.upper()}] Inserindo vídeo...")
                file_input.set_input_files(str(path))
                time.sleep(5)

                # Preenche legenda
                desc_input = page.locator('div[contenteditable="true"], textarea').first
                if desc_input.count():
                    desc_input.click()
                    desc_input.fill(caption)
                    print(f"[{self.name.upper()}] Legenda preenchida.")

                # Botão Publicar
                publish_btn = page.locator('button:has-text("Publicar"), button:has-text("Post"), button:has-text("Publish")').first
                publish_btn.wait_for(state="visible", timeout=60000)
                time.sleep(3)
                
                print(f"[{self.name.upper()}] Clicando em Publicar no Kwai...")
                publish_btn.click()
                time.sleep(6)

                print(f"[{self.name.upper()}] ✅ Vídeo publicado no Kwai com sucesso!")
                browser.close()

                return {
                    "success": True,
                    "platform": self.name,
                    "error": None
                }

        except Exception as e:
            return {
                "success": False,
                "platform": self.name,
                "error": str(e)
            }
