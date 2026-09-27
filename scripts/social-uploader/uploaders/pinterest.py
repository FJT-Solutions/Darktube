"""
uploaders/pinterest.py - Upload de Video Pins no Pinterest com Link de Destino via Playwright (Zero Aprovação).
"""

import json
import time
from pathlib import Path
from typing import Dict, Any, Optional
from playwright.sync_api import sync_playwright

from uploaders.base import BaseUploader
from config import SESSIONS_DIR, DEFAULT_USER_AGENT, DEFAULT_CHROMIUM_ARGS

class PinterestUploader(BaseUploader):
    def __init__(self):
        super().__init__("pinterest")
        self.cookie_file = SESSIONS_DIR / "pinterest_cookies.json"

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
                "error": f"Cookies do Pinterest não encontrados em {self.cookie_file}. Execute: python auth_manager.py --network pinterest"
            }

        with open(self.cookie_file, "r", encoding="utf-8") as f:
            cookies = json.load(f)

        pin_title = title or caption[:95]
        target_link = link or "https://fjt-solutions.com"

        print(f"[{self.name.upper()}] Iniciando upload de Video Pin: {path.name}...")
        print(f"[{self.name.upper()}] Link de Destino do Pin: {target_link}")

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(
                    headless=True,
                    args=DEFAULT_CHROMIUM_ARGS
                )
                context = browser.new_context(
                    user_agent=DEFAULT_USER_AGENT,
                    viewport={"width": 1280, "height": 900}
                )
                context.add_cookies(cookies)

                page = context.new_page()
                page.goto("https://www.pinterest.com/pin-creation-tool/", timeout=60000)
                page.wait_for_load_state("domcontentloaded")
                time.sleep(3)

                # Verifica se a sessão está ativa
                if "login" in page.url.lower():
                    browser.close()
                    return {
                        "success": False,
                        "platform": self.name,
                        "error": "Sessão do Pinterest expirada. Execute: python auth_manager.py --network pinterest"
                    }

                # Localiza input de upload de mídia
                file_input = page.locator('input[type="file"]').first
                if not file_input.count():
                    browser.close()
                    return {
                        "success": False,
                        "platform": self.name,
                        "error": "Campo de upload de mídia do Pinterest não encontrado."
                    }

                print(f"[{self.name.upper()}] Inserindo vídeo vertical...")
                file_input.set_input_files(str(path))
                time.sleep(4)

                # Preenche Título
                title_input = page.locator('input[placeholder*="título"], input[placeholder*="title"], [data-test-id*="pin-title"]').first
                if title_input.count():
                    title_input.click()
                    title_input.fill(pin_title)

                # Preenche Descrição
                desc_input = page.locator('div[contenteditable="true"], textarea[placeholder*="descrição"], textarea[placeholder*="description"]').first
                if desc_input.count():
                    desc_input.click()
                    desc_input.fill(caption)

                # Preenche Link de Destino (o diferencial valioso do Pinterest!)
                link_input = page.locator('input[placeholder*="link"], input[placeholder*="Link"], [data-test-id*="pin-link"]').first
                if link_input.count() and target_link:
                    link_input.click()
                    link_input.fill(target_link)
                    print(f"[{self.name.upper()}] Link de destino adicionado ao Pin: {target_link}")

                # Botão Publicar
                publish_btn = page.locator('button:has-text("Publicar"), button:has-text("Publish"), [data-test-id*="board-dropdown-save-button"]').first
                publish_btn.wait_for(state="visible", timeout=60000)
                time.sleep(3)
                
                print(f"[{self.name.upper()}] Clicando em Publicar Pin...")
                publish_btn.click()
                time.sleep(8)

                print(f"[{self.name.upper()}] ✅ Video Pin publicado com sucesso!")
                browser.close()

                return {
                    "success": True,
                    "platform": self.name,
                    "target_link": target_link,
                    "error": None
                }

        except Exception as e:
            return {
                "success": False,
                "platform": self.name,
                "error": str(e)
            }
