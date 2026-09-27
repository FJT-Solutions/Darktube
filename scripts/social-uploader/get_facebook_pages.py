"""
get_facebook_pages.py - Extrai as páginas do Facebook gerenciadas pelo usuário
usando a sessão autenticada em facebook_cookies.json.
"""

import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

from config import SESSIONS_DIR, DEFAULT_USER_AGENT

PAGES_OUTPUT_FILE = SESSIONS_DIR / "facebook_pages.json"

IGNORED_KEYWORDS = [
    "mensagem", "mensagens", "não lida", "meta business", 
    "descobrir", "notificações", "criar nova", "início", 
    "amigos", "vídeos", "marketplace", "grupos", "configurações", "promover"
]

IGNORED_URLS = [
    "/inbox", "/messages", "/afad/", "/notifications", 
    "category=", "business.facebook.com", "ref=bookmarks"
]

def fetch_facebook_pages():
    cookie_file = SESSIONS_DIR / "facebook_cookies.json"
    if not cookie_file.exists():
        print("[!] Arquivo facebook_cookies.json não encontrado.")
        return []

    with open(cookie_file, "r", encoding="utf-8") as f:
        cookies = json.load(f)

    pages = []
    seen_ids = set()

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = browser.new_context(
            user_agent=DEFAULT_USER_AGENT,
            viewport={"width": 1280, "height": 900}
        )
        context.add_cookies(cookies)
        page = context.new_page()

        try:
            print("[*] Acessando suas páginas no Facebook...")
            page.goto("https://www.facebook.com/pages/?category=your_pages", timeout=45000)
            page.wait_for_timeout(5000)

            # Localiza todos os links da tela
            link_elements = page.locator('a').all()
            print(f"[*] Analisando {len(link_elements)} links na interface...")

            for link in link_elements:
                try:
                    href = link.get_attribute("href") or ""
                    text = (link.inner_text() or "").strip()

                    if not text or len(text) < 2 or len(text) > 50:
                        continue

                    text_lower = text.lower()
                    if any(ig in text_lower for ig in IGNORED_KEYWORDS):
                        continue

                    if any(ig in href for ig in IGNORED_URLS):
                        continue

                    # Páginas têm links como facebook.com/pagename ou /profile.php?id=...
                    if "facebook.com/" in href or href.startswith("/"):
                        page_id = None
                        id_match = re.search(r'id=(\d+)', href)
                        if id_match:
                            page_id = id_match.group(1)
                        else:
                            clean = href.split("?")[0].rstrip("/").split("/")[-1]
                            if clean and clean not in ["home", "watch", "groups", "marketplace", "pages"]:
                                page_id = clean

                        if page_id and page_id not in seen_ids:
                            # Pega avatar se houver
                            avatar = ""
                            img = link.locator("img").first
                            if img.count() > 0:
                                avatar = img.get_attribute("src") or ""

                            # Limpa quebras de linha no nome da página
                            clean_name = text.split("\n")[0].strip()

                            seen_ids.add(page_id)
                            pages.append({
                                "id": page_id,
                                "name": clean_name,
                                "url": href if href.startswith("http") else f"https://www.facebook.com{href}",
                                "avatarUrl": avatar
                            })
                except Exception:
                    continue

        except Exception as e:
            print(f"[!] Erro ao navegar no Facebook: {e}")
        finally:
            browser.close()

    print(f"\n[+] Total de páginas reais encontradas: {len(pages)}")
    for p in pages:
        print(f"  🚩 {p['name']} (ID: {p['id']})")

    with open(PAGES_OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(pages, f, indent=2, ensure_ascii=False)

    print(f"📂 Salvo em: {PAGES_OUTPUT_FILE}")
    return pages

if __name__ == "__main__":
    fetch_facebook_pages()
