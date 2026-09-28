"""
cloud_auth.py - Navegador Visual Remoto Interativo na Nuvem para DarkTube

Arquitetura Queue-Driven Single-Threaded:
Todas as operações do Playwright rodam na thread principal (evitando greenlet switch errors).
Uma thread leve lê comandos do stdin e os enfileira na fila de execução.
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
    "instagram": "https://www.instagram.com/accounts/login/",
    "youtube": "https://accounts.google.com/ServiceLogin?service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2Fsignin%3Faction_handle_signin%3Dtrue",
    "tiktok": "https://www.tiktok.com/login",
    "pinterest": "https://www.pinterest.com/login/",
    "kwai": "https://creator.kwai.com/",
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
    page = None

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

        page = context.pages[0] if context.pages else context.new_page()
        page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.chrome = { runtime: {} };
        """)

        # Carrega cookies existentes para restaurar sessão anterior se houver
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
            page.goto(target_url, timeout=30000, wait_until="domcontentloaded")
        except Exception as e:
            emit({"status": "error", "message": f"Erro ao acessar {target_url}: {str(e)}"})
            return

        time.sleep(1.5)

        def capture_screenshot_base64() -> str:
            try:
                img_bytes = page.screenshot(type="jpeg", quality=65)
                return f"data:image/jpeg;base64,{base64.b64encode(img_bytes).decode('utf-8')}"
            except Exception:
                return ""

        def emit_frame():
            shot = capture_screenshot_base64()
            if shot:
                emit({
                    "status": "streaming",
                    "url": page.url,
                    "screenshot": shot,
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
        if is_logged_in_by_cookies(platform, context.cookies(), page.url):
            handle_success()
            return

        # Emite primeiro frame
        emit_frame()

        last_stream_time = time.time()
        last_cookie_check = time.time()

        # Loop principal de eventos (tudo na mesma thread principal!)
        while running:
            has_command = False

            # Processa todos os comandos pendentes na fila
            try:
                while True:
                    data = command_queue.get_nowait()
                    has_command = True
                    cmd = data.get("command")

                    if cmd == "click":
                        x = max(0, min(VIEWPORT_WIDTH, float(data.get("x", 0))))
                        y = max(0, min(VIEWPORT_HEIGHT, float(data.get("y", 0))))
                        page.mouse.click(x, y)
                    elif cmd == "type":
                        text = data.get("text", "")
                        if text:
                            page.keyboard.type(text, delay=15)
                    elif cmd == "press":
                        key = data.get("key", "")
                        if key:
                            page.keyboard.press(key)
                    elif cmd == "scroll":
                        delta_y = float(data.get("deltaY", 0))
                        page.mouse.wheel(0, delta_y)
                    elif cmd == "reload":
                        page.reload()
                    elif cmd == "cancel":
                        running = False
                        break
            except queue.Empty:
                pass

            if not running:
                break

            # Se executou um comando, emite frame imediato para resposta visual instantânea
            if has_command:
                time.sleep(0.08)
                emit_frame()
                last_stream_time = time.time()

            # Checagem de cookies de login a cada 1 segundo
            now = time.time()
            if now - last_cookie_check > 1.0:
                last_cookie_check = now
                if is_logged_in_by_cookies(platform, context.cookies(), page.url):
                    handle_success()
                    time.sleep(1.5)
                    break

            # Streaming periódico de tela a cada 0.8s
            if now - last_stream_time > 0.8:
                emit_frame()
                last_stream_time = now

            time.sleep(0.04)

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
