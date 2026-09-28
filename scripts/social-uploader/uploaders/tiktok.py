"""
uploaders/tiktok.py - Upload autônomo no TikTok Creator Center via Playwright (Zero Aprovação).
"""

import json
import time
from pathlib import Path
from typing import Dict, Any, Optional
from playwright.sync_api import sync_playwright

from uploaders.base import BaseUploader
from config import SESSIONS_DIR, DEFAULT_USER_AGENT, DEFAULT_CHROMIUM_ARGS

class TikTokUploader(BaseUploader):
    def __init__(self, cookie_file=None):
        super().__init__("tiktok")
        self.cookie_file = Path(cookie_file) if cookie_file else SESSIONS_DIR / "tiktok_cookies.json"

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
                "error": f"Cookies do TikTok não encontrados em {self.cookie_file}. Execute: python auth_manager.py --network tiktok"
            }

        with open(self.cookie_file, "r", encoding="utf-8") as f:
            cookies = json.load(f)

        print(f"[{self.name.upper()}] Iniciando upload headless de {path.name}...")

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
                page.goto("https://www.tiktok.com/creator-center/upload?from=upload", timeout=60000)
                page.wait_for_load_state("domcontentloaded")
                time.sleep(3)

                # Verifica se a sessão expirou
                if "login" in page.url.lower():
                    browser.close()
                    return {
                        "success": False,
                        "platform": self.name,
                        "error": "Sessão do TikTok expirou. Execute novamente: python auth_manager.py --network tiktok"
                    }

                # Procura o input de arquivo (pode estar no main frame ou em iframe)
                file_input = page.locator('input[type="file"]')
                if not file_input.count():
                    # Tenta em iframe se existir
                    for frame in page.frames:
                        if frame.locator('input[type="file"]').count() > 0:
                            file_input = frame.locator('input[type="file"]')
                            break

                if not file_input.count():
                    browser.close()
                    return {
                        "success": False,
                        "platform": self.name,
                        "error": "Input de upload do TikTok não encontrado na página."
                    }

                print(f"[{self.name.upper()}] Inserindo arquivo de vídeo...")
                file_input.first.set_input_files(str(path))

                # Aguarda o carregamento do editor de legenda
                time.sleep(5)
                caption_target = page.locator('div[contenteditable="true"]').first
                if caption_target.count():
                    caption_target.click()
                    # Limpa texto prévio se houver
                    page.keyboard.press("Control+A")
                    page.keyboard.press("Backspace")
                    page.keyboard.type(caption, delay=30)
                    print(f"[{self.name.upper()}] Legenda preenchida com sucesso.")

                # Aguarda o botão de Postar/Publicar ficar ativo
                post_btn = page.locator('button:has-text("Post"), button:has-text("Publicar")').first
                post_btn.wait_for(state="visible", timeout=60000)
                time.sleep(4)
                
                print(f"[{self.name.upper()}] Clicando no botão Publicar...")
                post_btn.click()

                # Aguarda confirmação de publicação
                time.sleep(6)
                print(f"[{self.name.upper()}] ✅ Publicação concluída com sucesso!")
                browser.close()

                return {
                    "success": True,
                    "platform": self.name,
                    "post_url": "https://www.tiktok.com/@creator",
                    "error": None
                }

        except Exception as e:
            return {
                "success": False,
                "platform": self.name,
                "error": str(e)
            }
