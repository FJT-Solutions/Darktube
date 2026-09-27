"""
uploaders/facebook.py - Upload autônomo de Reels no Facebook e Páginas do Facebook via Playwright (Zero Aprovação).
"""

import os
import json
import time
from pathlib import Path
from typing import Dict, Any, Optional
from playwright.sync_api import sync_playwright

from uploaders.base import BaseUploader
from config import SESSIONS_DIR, DEFAULT_USER_AGENT, DEFAULT_CHROMIUM_ARGS

class FacebookUploader(BaseUploader):
    def __init__(self):
        super().__init__("facebook_reels")
        self.cookie_file = SESSIONS_DIR / "facebook_cookies.json"
        self.pages_file = SESSIONS_DIR / "facebook_pages.json"
        self.profile_dir = SESSIONS_DIR / "profiles" / "facebook"

    def upload(
        self, 
        video_path: str, 
        caption: str, 
        title: Optional[str] = None, 
        link: Optional[str] = None,
        facebook_page_id: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        path = self.validate_file(video_path)
        
        if not self.cookie_file.exists() and not self.profile_dir.exists():
            return {
                "success": False,
                "platform": self.name,
                "error": f"Sessão do Facebook não encontrada. Conecte sua conta em Credenciais."
            }

        print(f"[{self.name.upper()}] 🚀 Iniciando upload de Reel: {path.name} ({path.stat().st_size / (1024*1024):.2f} MB)...")
        if facebook_page_id:
            print(f"[{self.name.upper()}] 🚩 Página alvo especificada: {facebook_page_id}")

        # Busca nome amigável da página se existir no facebook_pages.json
        target_page_name = None
        if facebook_page_id and self.pages_file.exists():
            try:
                with open(self.pages_file, "r", encoding="utf-8") as f:
                    pages_data = json.load(f)
                    for p_item in pages_data:
                        if p_item.get("id") == facebook_page_id or p_item.get("name") == facebook_page_id:
                            target_page_name = p_item.get("name")
                            break
            except Exception:
                pass

        try:
            with sync_playwright() as p:
                # Prioriza o perfil persistente com cookies de fallback
                if self.profile_dir.exists():
                    context = p.chromium.launch_persistent_context(
                        user_data_dir=str(self.profile_dir),
                        headless=True,
                        args=DEFAULT_CHROMIUM_ARGS
                    )
                    page = context.pages[0] if context.pages else context.new_page()
                else:
                    browser = p.chromium.launch(
                        headless=True,
                        args=DEFAULT_CHROMIUM_ARGS
                    )
                    context = browser.new_context(
                        user_agent=DEFAULT_USER_AGENT,
                        viewport={"width": 1280, "height": 900}
                    )
                    with open(self.cookie_file, "r", encoding="utf-8") as f:
                        cookies = json.load(f)
                    context.add_cookies(cookies)
                    page = context.new_page()

                # Garante que os cookies salvos estejam sincronizados
                if self.cookie_file.exists():
                    try:
                        with open(self.cookie_file, "r", encoding="utf-8") as f:
                            saved_cookies = json.load(f)
                        context.add_cookies(saved_cookies)
                    except Exception:
                        pass

                # Navega diretamente para o compositor oficial de Reels do Meta Business Suite
                print(f"[{self.name.upper()}] Acessando Meta Business Suite Reels Composer...")
                page.goto("https://business.facebook.com/latest/reels_composer", timeout=45000)
                page.wait_for_timeout(6000)

                current_url = page.url.lower()
                print(f"[{self.name.upper()}] URL após carregamento: {current_url}")
                if "login.php" in current_url or "/login/" in current_url or "/login?" in current_url:
                    context.close()
                    return {
                        "success": False,
                        "platform": self.name,
                        "error": "Sessão do Facebook expirou. Acesse Credenciais e conecte novamente."
                    }

                # 1. Seleciona a página do Facebook desejada se houver alvo especificado
                if target_page_name:
                    print(f"[{self.name.upper()}] Verificando página selecionada para '{target_page_name}'...")
                    try:
                        # Verifica se a página atual já é a desejada
                        postar_em_card = page.locator('text="Postar em"').first
                        if postar_em_card.count() > 0:
                            card_parent = postar_em_card.locator('xpath=..')
                            if target_page_name.lower() not in card_parent.inner_text().lower():
                                print(f"[{self.name.upper()}] Trocando de página para '{target_page_name}'...")
                                # Clica no seletor de página
                                selector_btn = page.locator('div[role="combobox"], [aria-label*="Postar em"]').first
                                if selector_btn.count() > 0:
                                    selector_btn.click()
                                    page.wait_for_timeout(1500)
                                    target_option = page.locator(f'text="{target_page_name}"').first
                                    if target_option.count() > 0:
                                        target_option.click()
                                        page.wait_for_timeout(2000)
                                        print(f"[{self.name.upper()}] ✅ Página alternada para: {target_page_name}")
                                        page.keyboard.press("Escape")
                                        page.wait_for_timeout(500)
                    except Exception as page_switch_err:
                        print(f"[{self.name.upper()}] [!] Aviso ao alternar página: {page_switch_err}")

                # Garante que qualquer overlay aberto seja fechado
                page.keyboard.press("Escape")
                page.wait_for_timeout(500)

                # 2. Upload do arquivo de vídeo
                uploaded_via_input = False
                file_input = page.locator('input[type="file"][accept*="video"], input[type="file"]').first
                if file_input.count() > 0:
                    try:
                        file_input.set_input_files(str(path))
                        uploaded_via_input = True
                        print(f"[{self.name.upper()}] ✅ Vídeo inserido diretamente no input de arquivos.")
                    except Exception as input_err:
                        print(f"[{self.name.upper()}] Fallback para clique de upload: {input_err}")

                if not uploaded_via_input:
                    add_btn = page.locator('text="Adicionar vídeo"').first
                    if not add_btn.count() or not add_btn.is_visible():
                        add_btn = page.locator('button:has-text("Adicionar vídeo"), div[role="button"]:has-text("Adicionar vídeo")').first

                    if not add_btn.count():
                        context.close()
                        return {
                            "success": False,
                            "platform": self.name,
                            "error": "Botão 'Adicionar vídeo' não encontrado no compositor do Facebook."
                        }

                    print(f"[{self.name.upper()}] Inserindo vídeo no compositor...")
                    page.keyboard.press("Escape")
                    page.wait_for_timeout(300)
                    with page.expect_file_chooser(timeout=30000) as fc_info:
                        add_btn.click(force=True)
                    file_chooser = fc_info.value
                    file_chooser.set_files(str(path))

                # 3. Aguarda o upload do vídeo atingir 100%
                print(f"[{self.name.upper()}] Aguardando compilação e upload atingir 100%...")
                try:
                    page.wait_for_selector('text="100%"', timeout=60000)
                    print(f"[{self.name.upper()}] ✅ Upload do vídeo concluído (100%)!")
                except Exception:
                    # Fallback: aguarda alguns segundos para o botão 'Avançar' ficar ativo
                    page.wait_for_timeout(8000)

                # 4. Preenche a legenda e hashtags do Reel
                if caption:
                    print(f"[{self.name.upper()}] Inserindo legenda e hashtags...")
                    try:
                        caption_box = page.locator('div[contenteditable="true"], div[role="textbox"]').first
                        if caption_box.count() > 0 and caption_box.is_visible():
                            caption_box.click()
                            page.keyboard.press("Control+A")
                            page.keyboard.press("Backspace")
                            page.keyboard.type(caption, delay=15)
                            print(f"[{self.name.upper()}] ✅ Legenda preenchida com sucesso.")
                    except Exception as cap_err:
                        print(f"[{self.name.upper()}] [!] Aviso ao preencher legenda: {cap_err}")

                page.wait_for_timeout(2000)

                # 5. Avança da Etapa 1 (Criar) para Etapa 2 (Editar)
                next_btn_1 = page.locator('button:has-text("Avançar"), div[role="button"]:has-text("Avançar")').last
                if next_btn_1.count() > 0 and next_btn_1.is_visible():
                    next_btn_1.click()
                    print(f"[{self.name.upper()}] Avançando para etapa 2 (Editar)...")
                    page.wait_for_timeout(3500)

                # 6. Avança da Etapa 2 (Editar) para Etapa 3 (Compartilhar)
                next_btn_2 = page.locator('button:has-text("Avançar"), div[role="button"]:has-text("Avançar")').last
                if next_btn_2.count() > 0 and next_btn_2.is_visible():
                    next_btn_2.click()
                    print(f"[{self.name.upper()}] Avançando para etapa 3 (Compartilhar)...")
                    page.wait_for_timeout(4000)

                # 7. Localiza o botão real azul de Compartilhar no rodapé (ignora abas/breadcrumbs do topo)
                share_buttons = page.locator('div[role="button"]:has-text("Compartilhar"), button:has-text("Compartilhar")').all()
                target_share_btn = None
                for b in share_buttons:
                    t = b.inner_text().strip()
                    box = b.bounding_box()
                    if t == "Compartilhar" and box and box['y'] > 300:
                        target_share_btn = b
                        break

                if not target_share_btn:
                    # Fallback
                    target_share_btn = page.locator('div[role="button"]:has-text("Compartilhar"), button:has-text("Compartilhar")').last

                if not target_share_btn:
                    context.close()
                    return {
                        "success": False,
                        "platform": self.name,
                        "error": "Botão 'Compartilhar' não encontrado na etapa final."
                    }

                print(f"[{self.name.upper()}] 🚀 Clicando no botão Compartilhar Reel no Facebook...")
                target_share_btn.click()

                # 8. Aguarda o modal de confirmação do Facebook ("Reel em processamento")
                print(f"[{self.name.upper()}] Aguardando confirmação de publicação do Facebook...")
                try:
                    page.wait_for_selector('text="Reel em processamento", button:has-text("Concluir"), div[role="button"]:has-text("Concluir")', timeout=25000)
                    print(f"[{self.name.upper()}] Modal de processamento detectado com sucesso!")
                    concluir_btn = page.locator('button:has-text("Concluir"), div[role="button"]:has-text("Concluir")').first
                    if concluir_btn.count() > 0 and concluir_btn.is_visible():
                        concluir_btn.click()
                        page.wait_for_timeout(3000)
                except Exception:
                    page.wait_for_timeout(6000)

                screenshot_path = SESSIONS_DIR / "fb_publish_success.png"
                try:
                    page.screenshot(path=str(screenshot_path))
                except Exception:
                    pass

                print(f"[{self.name.upper()}] 🎉 Reel publicado com sucesso no Facebook!")
                context.close()

                return {
                    "success": True,
                    "platform": self.name,
                    "page": target_page_name or facebook_page_id or "Facebook Principal",
                    "error": None
                }

        except Exception as e:
            return {
                "success": False,
                "platform": self.name,
                "error": f"Erro inesperado no upload do Facebook: {str(e)}"
            }
