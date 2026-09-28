"""
cloud_auth.py - Navegador Visual Remoto Interativo na Nuvem para DarkTube

Permite que o usuário visualize e interaja (mouse, teclado, scroll) diretamente
com o navegador do servidor em tempo real através da interface web do DarkTube.
Assim que o login for concluído, detecta os cookies, salva na nuvem e encerra o navegador.
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

class RemoteBrowserSession:
    def __init__(self, platform: str):
        self.platform = platform.lower()
        self.running = True
        self.logged_in = False
        self.p = None
        self.browser = None
        self.context = None
        self.page = None
        self.lock = threading.Lock()
        self.last_screenshot_time = 0

    def capture_screenshot_base64(self) -> str:
        try:
            if not self.page:
                return ""
            img_bytes = self.page.screenshot(type="jpeg", quality=65)
            return f"data:image/jpeg;base64,{base64.b64encode(img_bytes).decode('utf-8')}"
        except Exception:
            return ""

    def emit_frame(self):
        with self.lock:
            if not self.page or self.logged_in:
                return
            screenshot = self.capture_screenshot_base64()
            if screenshot:
                emit({
                    "status": "streaming",
                    "url": self.page.url,
                    "screenshot": screenshot,
                })
                self.last_screenshot_time = time.time()

    def start(self):
        emit({"status": "starting", "message": f"Iniciando navegador virtual para {self.platform.upper()}..."})

        try:
            self.p = sync_playwright().start()

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

            user_data_dir = SESSIONS_DIR / "profiles" / f"remote_{self.platform}"
            user_data_dir.mkdir(parents=True, exist_ok=True)

            self.context = self.p.chromium.launch_persistent_context(
                user_data_dir=str(user_data_dir),
                headless=True,
                locale="pt-BR",
                extra_http_headers={"Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"},
                user_agent=DEFAULT_USER_AGENT,
                viewport={"width": VIEWPORT_WIDTH, "height": VIEWPORT_HEIGHT},
                args=browser_args,
            )

            self.page = self.context.pages[0] if self.context.pages else self.context.new_page()
            self.page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                window.chrome = { runtime: {} };
            """)

            # Carrega cookies existentes para tentar sessão anterior
            cookie_file = SESSIONS_DIR / f"{self.platform}_cookies.json"
            if cookie_file.exists():
                try:
                    with open(cookie_file, "r", encoding="utf-8") as f:
                        old_cookies = json.load(f)
                        self.context.add_cookies(old_cookies)
                except Exception:
                    pass

            target_url = LOGIN_URLS.get(self.platform, f"https://www.{self.platform}.com/login")
            emit({"status": "navigating", "message": f"Carregando {self.platform.upper()}..."})

            try:
                self.page.goto(target_url, timeout=30000, wait_until="domcontentloaded")
            except Exception as e:
                emit({"status": "error", "message": f"Erro ao acessar {target_url}: {str(e)}"})
                return

            time.sleep(1.5)

            # Se já estiver logado
            if is_logged_in_by_cookies(self.platform, self.context.cookies(), self.page.url):
                self._handle_success()
                return

            # Emite o primeiro frame com sucesso
            self.emit_frame()

            # Thread de streaming contínuo e verificação de login
            def stream_loop():
                while self.running and not self.logged_in:
                    time.sleep(0.8)
                    try:
                        with self.lock:
                            if not self.page:
                                break
                            cur_cookies = self.context.cookies()
                            cur_url = self.page.url

                            # Verifica se o usuário conseguiu logar
                            if is_logged_in_by_cookies(self.platform, cur_cookies, cur_url):
                                self._handle_success()
                                break

                            # Emite frame periódico
                            screenshot = self.capture_screenshot_base64()
                            if screenshot:
                                emit({
                                    "status": "streaming",
                                    "url": cur_url,
                                    "screenshot": screenshot,
                                })
                    except Exception:
                        pass

            stream_thread = threading.Thread(target=stream_loop, daemon=True)
            stream_thread.start()

        except Exception as err:
            emit({"status": "error", "message": f"Falha ao iniciar navegador: {str(err)}"})
            self.cleanup()

    # -------------------------------------------------------------
    # Comandos de Interação Remota (Mouse, Teclado, Scroll)
    # -------------------------------------------------------------
    def handle_click(self, x: float, y: float):
        """Executa clique do mouse no navegador remoto."""
        with self.lock:
            if not self.page:
                return
            try:
                # Garante que as coordenadas estão dentro do viewport
                clamped_x = max(0, min(VIEWPORT_WIDTH, float(x)))
                clamped_y = max(0, min(VIEWPORT_HEIGHT, float(y)))
                self.page.mouse.click(clamped_x, clamped_y)
                time.sleep(0.15)
                self.emit_frame()
            except Exception as e:
                pass

    def handle_type(self, text: str):
        """Digita texto diretamente no campo focado."""
        with self.lock:
            if not self.page:
                return
            try:
                self.page.keyboard.type(text, delay=20)
                time.sleep(0.1)
                self.emit_frame()
            except Exception as e:
                pass

    def handle_press(self, key: str):
        """Pressiona uma tecla especial (Enter, Backspace, Tab, etc.)."""
        with self.lock:
            if not self.page:
                return
            try:
                self.page.keyboard.press(key)
                time.sleep(0.15)
                self.emit_frame()
            except Exception as e:
                pass

    def handle_scroll(self, delta_y: float):
        """Executa rolagem da página."""
        with self.lock:
            if not self.page:
                return
            try:
                self.page.mouse.wheel(0, float(delta_y))
                time.sleep(0.1)
                self.emit_frame()
            except Exception:
                pass

    def handle_reload(self):
        """Recarrega a página atual."""
        with self.lock:
            if not self.page:
                return
            try:
                self.page.reload()
                time.sleep(1)
                self.emit_frame()
            except Exception:
                pass

    def _handle_success(self):
        if self.logged_in:
            return
        self.logged_in = True
        cookies = self.context.cookies()

        cookie_file = SESSIONS_DIR / f"{self.platform}_cookies.json"
        with open(cookie_file, "w", encoding="utf-8") as f:
            json.dump(cookies, f, indent=2, ensure_ascii=False)

        # Remove arquivo de expirado se houver
        expired_file = SESSIONS_DIR / f"{self.platform}_expired.json"
        if expired_file.exists():
            try: expired_file.unlink()
            except Exception: pass

        if self.platform in ["instagram", "facebook"]:
            try_save_instagrapi_session(cookies)

        if self.platform == "facebook":
            try:
                import subprocess
                get_pages_script = Path(__file__).parent / "get_facebook_pages.py"
                if get_pages_script.exists():
                    subprocess.Popen([sys.executable, str(get_pages_script)])
            except Exception:
                pass

        emit({
            "status": "success",
            "message": f"🎉 Conta {self.platform.upper()} conectada com sucesso!",
            "cookies": cookies,
            "cookiesCount": len(cookies),
        })
        time.sleep(1.5)
        self.cleanup()

    def cleanup(self):
        self.running = False
        try:
            if self.context:
                self.context.close()
        except Exception:
            pass
        try:
            if self.p:
                self.p.stop()
        except Exception:
            pass


def main():
    parser = argparse.ArgumentParser(description="Navegador Visual Remoto DarkTube")
    parser.add_argument("--platform", type=str, required=True)
    args = parser.parse_args()

    session = RemoteBrowserSession(platform=args.platform)

    # Thread que escuta comandos do stdin
    def stdin_listener():
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                cmd = data.get("command")
                if cmd == "start":
                    session.start()
                elif cmd == "click":
                    session.handle_click(data.get("x", 0), data.get("y", 0))
                elif cmd == "type":
                    session.handle_type(data.get("text", ""))
                elif cmd == "press":
                    session.handle_press(data.get("key", ""))
                elif cmd == "scroll":
                    session.handle_scroll(data.get("deltaY", 0))
                elif cmd == "reload":
                    session.handle_reload()
                elif cmd == "cancel":
                    session.running = False
                    session.cleanup()
                    emit({"status": "cancelled", "message": "Navegador encerrado pelo usuário."})
                    sys.exit(0)
            except Exception as e:
                pass

    listener_thread = threading.Thread(target=stdin_listener, daemon=True)
    listener_thread.start()

    while session.running:
        time.sleep(0.5)

if __name__ == "__main__":
    main()
