"""
cloud_auth.py - Navegador Visual Remoto Interativo na Nuvem para DarkTube

Arquitetura Queue-Driven Single-Threaded:
- Suporte a Múltiplas Abas e Popups (ex: "Continuar com o Google" / OAuth)
- Troca automática de foco para popups de autenticação
- Anti-Detecção Stealth com WebGL habilitado para evitar telas brancas (Instagram, TikTok)
- Loop de baixa latência (stream a cada 400ms, comandos imediatos com 30ms)
- Digitação ultra-rápida e preenchimento direto
"""

import sys
if hasattr(sys.stdout, "reconfigure"):
    try: sys.stdout.reconfigure(encoding="utf-8")
    except Exception: pass
if hasattr(sys.stdin, "reconfigure"):
    try: sys.stdin.reconfigure(encoding="utf-8")
    except Exception: pass

import os
import json
import time
import base64
import queue
import argparse
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

from config import SESSIONS_DIR, DEFAULT_USER_AGENT
from auth_manager import is_logged_in_by_cookies, try_save_instagrapi_session

LOGIN_URLS = {
    "facebook": "https://www.facebook.com/login/",
    "instagram": "https://www.instagram.com/",
    "youtube": "https://accounts.google.com/ServiceLogin?service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2Fsignin%3Faction_handle_signin%3Dtrue",
    "tiktok": "https://www.tiktok.com/login",
    "pinterest": "https://www.pinterest.com/login/",
    "kwai": "https://www.kwai.com/",
    "threads": "https://www.threads.net/login",
}

VIEWPORT_WIDTH = 1280
VIEWPORT_HEIGHT = 800

def emit(data: dict):
    payload = json.dumps(data, ensure_ascii=False)
    print(f"__EVENT__{payload}", flush=True)

def main():
    parser = argparse.ArgumentParser(description="Navegador Visual Remoto DarkTube")
    parser.add_argument("--platform", type=str, required=True)
    args = parser.parse_args()

    platform = args.platform.lower()
    command_queue = queue.Queue()
    running = True

    # Thread que apenas lê comandos do stdin e coloca na fila
    def stdin_reader():
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                cmd_data = json.loads(line)
                command_queue.put(cmd_data)
            except Exception:
                pass

    reader_thread = threading.Thread(target=stdin_reader, daemon=True)
    reader_thread.start()

    emit({"status": "starting", "message": f"Iniciando navegador virtual para {platform.upper()}..."})

    p = None
    context = None

    try:
        p = sync_playwright().start()

        browser_args = [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--no-first-run",
            "--no-default-browser-check",
            "--lang=pt-BR,pt",
            "--enable-webgl",
            "--ignore-certificate-errors",
            f"--window-size={VIEWPORT_WIDTH},{VIEWPORT_HEIGHT}",
        ]

        user_data_dir = SESSIONS_DIR / "profiles" / f"remote_{platform}"
        user_data_dir.mkdir(parents=True, exist_ok=True)

        context = p.chromium.launch_persistent_context(
            user_data_dir=str(user_data_dir),
            headless=True,
            locale="pt-BR",
            extra_http_headers={"Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"},
            user_agent=DEFAULT_USER_AGENT,
            viewport={"width": VIEWPORT_WIDTH, "height": VIEWPORT_HEIGHT},
            args=browser_args,
        )

        def setup_page_stealth(pg):
            try:
                pg.add_init_script("""
                    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                    window.chrome = { runtime: {} };
                    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                    Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
                """)
            except Exception:
                pass

        active_page = context.pages[0] if context.pages else context.new_page()
        setup_page_stealth(active_page)

        # Trata popups (ex: "Continuar com o Google" abre uma nova janela)
        def handle_new_page(new_p):
            nonlocal active_page
            setup_page_stealth(new_p)
            active_page = new_p

            def on_page_close():
                nonlocal active_page
                valid = [pg for pg in context.pages if not pg.is_closed()]
                if valid:
                    active_page = valid[-1]
                time.sleep(0.1)
                emit_frame()

            new_p.on("close", on_page_close)
            time.sleep(0.2)
            emit_frame()

        context.on("page", handle_new_page)

        # Carrega cookies existentes para restaurar sessão se houver
        cookie_file = SESSIONS_DIR / f"{platform}_cookies.json"
        if cookie_file.exists():
            try:
                with open(cookie_file, "r", encoding="utf-8") as f:
                    old_cookies = json.load(f)
                    context.add_cookies(old_cookies)
            except Exception:
                pass

        target_url = LOGIN_URLS.get(platform, f"https://www.{platform}.com/login")
        emit({"status": "navigating", "message": f"Carregando {platform.upper()}..."})

        try:
            active_page.goto(target_url, timeout=30000, wait_until="domcontentloaded")
        except Exception as e:
            emit({"status": "error", "message": f"Erro ao acessar {target_url}: {str(e)}"})
            return

        time.sleep(1.2)

        def get_current_page():
            nonlocal active_page
            if active_page.is_closed():
                valid = [pg for pg in context.pages if not pg.is_closed()]
                if valid:
                    active_page = valid[-1]
                else:
                    active_page = context.new_page()
            return active_page

        def capture_screenshot_base64() -> str:
            try:
                curr = get_current_page()
                img_bytes = curr.screenshot(type="jpeg", quality=55)
                return f"data:image/jpeg;base64,{base64.b64encode(img_bytes).decode('utf-8')}"
            except Exception:
                return ""

        def emit_frame():
            shot = capture_screenshot_base64()
            if shot:
                curr = get_current_page()
                url = ""
                title = ""
                try:
                    url = curr.url
                    title = curr.title()
                except Exception:
                    pass

                pages_info = []
                for idx, pg in enumerate(context.pages):
                    try:
                        if not pg.is_closed():
                            pages_info.append({
                                "index": idx,
                                "title": pg.title() or f"Aba {idx + 1}",
                                "url": pg.url,
                                "isActive": pg == curr,
                            })
                    except Exception:
                        pass

                emit({
                    "status": "streaming",
                    "url": url,
                    "title": title,
                    "screenshot": shot,
                    "pageCount": len(pages_info),
                    "isPopup": len(pages_info) > 1 and curr != context.pages[0],
                    "pages": pages_info,
                })

        def handle_success():
            cookies = context.cookies()
            with open(cookie_file, "w", encoding="utf-8") as f:
                json.dump(cookies, f, indent=2, ensure_ascii=False)

            expired_file = SESSIONS_DIR / f"{platform}_expired.json"
            if expired_file.exists():
                try: expired_file.unlink()
                except Exception: pass

            if platform in ["instagram", "facebook"]:
                try_save_instagrapi_session(cookies)

            if platform == "facebook":
                try:
                    import subprocess
                    get_pages_script = Path(__file__).parent / "get_facebook_pages.py"
                    if get_pages_script.exists():
                        subprocess.Popen([sys.executable, str(get_pages_script)])
                except Exception:
                    pass

            emit({
                "status": "success",
                "message": f"🎉 Conta {platform.upper()} conectada com sucesso!",
                "cookies": cookies,
                "cookiesCount": len(cookies),
            })

        # Verifica se já está logado
        curr = get_current_page()
        if is_logged_in_by_cookies(platform, context.cookies(), curr.url):
            handle_success()
            return

        # Emite primeiro frame
        emit_frame()

        last_stream_time = time.time()
        last_cookie_check = time.time()

        # Loop principal de eventos na thread principal do Playwright
        while running:
            has_command = False

            # Processa comandos da fila
            try:
                while True:
                    data = command_queue.get_nowait()
                    has_command = True
                    cmd = data.get("command")
                    curr = get_current_page()

                    if cmd == "click":
                        x = max(0, min(VIEWPORT_WIDTH, float(data.get("x", 0))))
                        y = max(0, min(VIEWPORT_HEIGHT, float(data.get("y", 0))))
                        curr.mouse.click(x, y)

                    elif cmd == "switch_tab":
                        idx = int(data.get("index", 0))
                        valid = [pg for pg in context.pages if not pg.is_closed()]
                        if 0 <= idx < len(valid):
                            active_page = valid[idx]

                    elif cmd == "close_tab":
                        idx = data.get("index")
                        valid = [pg for pg in context.pages if not pg.is_closed()]
                        if idx is not None and 0 <= idx < len(valid) and len(valid) > 1:
                            valid[idx].close()
                            remaining = [pg for pg in context.pages if not pg.is_closed()]
                            active_page = remaining[-1] if remaining else context.new_page()

                    elif cmd == "fill_field":
                        field = data.get("field")
                        val = data.get("value", "")
                        if field == "email":
                            loc = curr.locator('input[type="email"], input[name="email"], input[name="identifier"], input[type="text"], input#email').first
                            if loc.is_visible(timeout=1200):
                                loc.click()
                                loc.fill(val)
                        elif field == "password":
                            loc = curr.locator('input[type="password"], input[name="pass"], input[name="Passwd"], input#pass').first
                            if loc.is_visible(timeout=1200):
                                loc.click()
                                loc.fill(val)
                        elif field == "submit":
                            loc = curr.locator('button[type="submit"], button:has-text("Avançar"), button:has-text("Next"), button:has-text("Entrar"), button#loginbutton, [role="button"]:has-text("Avançar")').first
                            if loc.is_visible(timeout=1200):
                                loc.click()

                    elif cmd == "fill_and_submit":
                        email_val = data.get("email", "")
                        pass_val = data.get("password", "")

                        if email_val:
                            loc_email = curr.locator('input[type="email"], input[name="email"], input[name="identifier"], input[type="text"], input#email').first
                            if loc_email.is_visible(timeout=1200):
                                loc_email.click()
                                loc_email.fill(email_val)
                                time.sleep(0.05)

                        if pass_val:
                            loc_pass = curr.locator('input[type="password"], input[name="pass"], input[name="Passwd"], input#pass').first
                            if loc_pass.is_visible(timeout=1200):
                                loc_pass.click()
                                loc_pass.fill(pass_val)
                                time.sleep(0.05)

                        loc_btn = curr.locator('button[type="submit"], button:has-text("Avançar"), button:has-text("Next"), button:has-text("Entrar"), button#loginbutton, [role="button"]:has-text("Avançar")').first
                        if loc_btn.is_visible(timeout=1200):
                            loc_btn.click()
                        else:
                            curr.keyboard.press("Enter")

                    elif cmd == "type":
                        text = data.get("text", "")
                        if text:
                            # Foco inteligente se nenhum input estiver focado
                            try:
                                is_input_focused = curr.evaluate("() => ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)")
                                if not is_input_focused:
                                    if "@" in text:
                                        curr.locator('input[type="email"], input[name="email"], input[name="identifier"], input[type="text"]').first.click(timeout=1000)
                                    else:
                                        curr.locator('input[type="password"], input[name="pass"]').first.click(timeout=1000)
                            except Exception:
                                pass
                            curr.keyboard.type(text, delay=2)

                    elif cmd == "press":
                        key = data.get("key", "")
                        if key:
                            curr.keyboard.press(key)

                    elif cmd == "scroll":
                        delta_y = float(data.get("deltaY", 0))
                        curr.mouse.wheel(0, delta_y)

                    elif cmd == "reload":
                        curr.reload()

                    elif cmd == "cancel":
                        running = False
                        break
            except queue.Empty:
                pass

            if not running:
                break

            # Se executou comando, gera frame com resposta quase instantânea (30ms)
            if has_command:
                time.sleep(0.03)
                emit_frame()
                last_stream_time = time.time()

            # Checagem de cookies de login a cada 1 segundo
            now = time.time()
            if now - last_cookie_check > 1.0:
                last_cookie_check = now
                curr = get_current_page()
                if is_logged_in_by_cookies(platform, context.cookies(), curr.url):
                    handle_success()
                    time.sleep(1.2)
                    break

            # Streaming contínuo a cada 400ms para fluidez alta
            if now - last_stream_time > 0.4:
                emit_frame()
                last_stream_time = now

            time.sleep(0.03)

    except Exception as err:
        emit({"status": "error", "message": f"Erro no navegador: {str(err)}"})
    finally:
        try:
            if context:
                context.close()
        except Exception:
            pass
        try:
            if p:
                p.stop()
        except Exception:
            pass

if __name__ == "__main__":
    main()
