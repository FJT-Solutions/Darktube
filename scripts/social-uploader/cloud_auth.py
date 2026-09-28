"""
cloud_auth.py - Autenticador Interativo em Nuvem para Redes Sociais

Executa navegador Playwright em modo headless na nuvem, com protocolo JSON-RPC
via stdin/stdout para interagir com a interface web do DarkTube em tempo real:
- Login por credenciais (Email / Senha)
- Login por QR Code (TikTok / Kwai)
- Desafio de número na tela (Google Prompt / Meta)
- Código de 2 fatores (2FA / SMS / Authenticator)
- Aprovação em outro dispositivo ("Toque em Sim no smartphone")
- Captura e salvamento automático de cookies no banco e em disco
"""

import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if hasattr(sys.stdin, "reconfigure"):
    try:
        sys.stdin.reconfigure(encoding="utf-8")
    except Exception:
        pass

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

def emit(data: dict):
    """Envia evento JSON formatado para o Node.js via stdout."""
    payload = json.dumps(data, ensure_ascii=False)
    print(f"__EVENT__{payload}", flush=True)

class CloudAuthSession:
    def __init__(self, platform: str, mode: str = "credentials"):
        self.platform = platform.lower()
        self.mode = mode
        self.running = True
        self.cookies = []
        self.p = None
        self.browser = None
        self.context = None
        self.page = None
        self.pending_input = None
        self.input_event = threading.Event()

    def receive_input(self, data: dict):
        """Recebe ação enviada pelo usuário via stdin."""
        self.pending_input = data
        self.input_event.set()

    def wait_for_user_input(self, timeout: float = 300) -> dict:
        """Aguarda resposta do usuário (ex: código 2FA digitado)."""
        self.input_event.clear()
        signaled = self.input_event.wait(timeout=timeout)
        if not signaled:
            return {"command": "timeout"}
        res = self.pending_input
        self.pending_input = None
        return res

    def capture_screenshot_base64(self, element=None) -> str:
        """Tira screenshot da página ou de um elemento específico em base64."""
        try:
            target = element if element else self.page
            if not target:
                return ""
            img_bytes = target.screenshot(type="jpeg", quality=75)
            return f"data:image/jpeg;base64,{base64.b64encode(img_bytes).decode('utf-8')}"
        except Exception:
            return ""

    def start(self, username: str = "", password: str = ""):
        emit({"status": "starting", "message": f"Iniciando navegador seguro para {self.platform.upper()}..."})

        try:
            self.p = sync_playwright().start()

            # Argumentos otimizados para execução sem tela em containers Linux/Docker
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

            user_data_dir = SESSIONS_DIR / "profiles" / f"cloud_{self.platform}"
            user_data_dir.mkdir(parents=True, exist_ok=True)

            self.context = self.p.chromium.launch_persistent_context(
                user_data_dir=str(user_data_dir),
                headless=True,
                locale="pt-BR",
                extra_http_headers={"Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"},
                user_agent=DEFAULT_USER_AGENT,
                viewport={"width": 1280, "height": 800},
                args=browser_args,
            )

            self.page = self.context.pages[0] if self.context.pages else self.context.new_page()
            self.page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                window.chrome = { runtime: {} };
            """)

            # Carrega cookies existentes se houver para tentar auto-reconexão
            cookie_file = SESSIONS_DIR / f"{self.platform}_cookies.json"
            if cookie_file.exists():
                try:
                    with open(cookie_file, "r", encoding="utf-8") as f:
                        old_cookies = json.load(f)
                        self.context.add_cookies(old_cookies)
                except Exception:
                    pass

            target_url = LOGIN_URLS.get(self.platform, f"https://www.{self.platform}.com/login")
            emit({"status": "navigating", "message": f"Carregando tela de login de {self.platform.upper()}..."})

            try:
                self.page.goto(target_url, timeout=45000, wait_until="domcontentloaded")
            except Exception as e:
                emit({"status": "error", "message": f"Erro ao acessar {target_url}: {str(e)}"})
                return

            time.sleep(2)

            # Verifica se já está logado
            if is_logged_in_by_cookies(self.platform, self.context.cookies(), self.page.url):
                self._handle_success()
                return

            if self.mode == "qr_code" and self.platform == "tiktok":
                self._handle_tiktok_qr()
            elif self.platform == "facebook":
                self._handle_facebook_flow(username, password)
            elif self.platform == "instagram":
                self._handle_instagram_flow(username, password)
            elif self.platform == "youtube":
                self._handle_google_flow(username, password)
            elif self.platform == "tiktok":
                # TikTok: se tiver credenciais tenta login, senão cai no QR Code
                if username and password:
                    self._handle_tiktok_credentials(username, password)
                else:
                    self._handle_tiktok_qr()
            else:
                self._handle_generic_flow(username, password)

        except Exception as err:
            emit({"status": "error", "message": f"Falha na autenticação: {str(err)}"})
        finally:
            self.cleanup()

    # -------------------------------------------------------------
    # Fluxo Facebook
    # -------------------------------------------------------------
    def _handle_facebook_flow(self, username: str, password: str):
        emit({"status": "logging_in", "message": "Preenchendo credenciais no Facebook..."})

        # 1. Trata banners de cookies (comuns em IPs europeus)
        try:
            cookie_accept = self.page.locator('button[data-cookiebanner="accept_button"], button:has-text("Autoriser"), button:has-text("Permitir"), button:has-text("Aceitar"), button:has-text("Allow"), button:has-text("Alle")').first
            if cookie_accept.is_visible(timeout=2500):
                cookie_accept.click()
                time.sleep(1)
        except Exception:
            pass

        # 2. Localiza e preenche usuário e senha
        try:
            email_input = self.page.locator('input#email, input[name="email"], input[type="text"]').first
            email_input.wait_for(state="visible", timeout=12000)
            email_input.fill(username)

            pass_input = self.page.locator('input#pass, input[name="pass"], input[type="password"]').first
            pass_input.wait_for(state="visible", timeout=12000)
            pass_input.fill(password)
        except Exception as e:
            emit({
                "status": "error", 
                "message": f"Não foi possível localizar os campos de login do Facebook: {str(e)}",
                "screenshot": self.capture_screenshot_base64()
            })
            return

        # 3. Submissão segura e universal via tecla Enter no campo de senha
        try:
            pass_input.press("Enter")
        except Exception:
            pass

        # Tenta também clicar no botão como reforço
        submit_selectors = [
            'button[name="login"]',
            'button#loginbutton',
            'button[type="submit"]',
            '[data-testid="royal_login_button"]',
            'button:has-text("Entrar")',
            'button:has-text("Se connecter")',
            'button:has-text("Log In")',
            'button:has-text("Iniciar sesión")',
            '[role="button"]:has-text("Entrar")',
            '[role="button"]:has-text("Se connecter")',
            '[role="button"]:has-text("Log In")',
            'form button',
        ]
        for sel in submit_selectors:
            try:
                btn = self.page.locator(sel).first
                if btn.is_visible(timeout=1000):
                    btn.click(timeout=2000)
                    break
            except Exception:
                continue

        # Monitora a resposta do Facebook por até 90 segundos
        emit({"status": "waiting", "message": "Aguardando resposta do Facebook..."})
        start_time = time.time()

        while time.time() - start_time < 90 and self.running:
            time.sleep(2)
            cur_cookies = self.context.cookies()
            cur_url = self.page.url.lower()

            if is_logged_in_by_cookies("facebook", cur_cookies, self.page.url):
                self._handle_success()
                return

            # Se aparecer botão "Continuar como [Nome]"
            try:
                continue_btn = self.page.locator('button:has-text("Continuar como"), button:has-text("Continue as"), button:has-text("Continuer en tant que")').first
                if continue_btn.is_visible(timeout=1000):
                    continue_btn.click()
                    time.sleep(2)
            except Exception:
                pass

            # Erro de senha ou credencial inválida
            page_text = self.page.content().lower()
            if any(term in page_text for term in ["a senha que você inseriu está incorreta", "the password that you've entered is incorrect", "le mot de passe que vous avez entré est incorrect", "credenciais incorretas"]):
                emit({
                    "status": "error",
                    "message": "E-mail ou senha incorretos no Facebook. Verifique suas credenciais.",
                    "screenshot": self.capture_screenshot_base64()
                })
                return

            # Verificação de 2FA (Código numérico de SMS ou Authenticator)
            two_fa_input = self.page.locator('input[name="approvals_code"], input#approvals_code, input[placeholder*="código" i], input[placeholder*="code" i]').first
            if two_fa_input.is_visible():
                emit({
                    "status": "needs_2fa",
                    "message": "O Facebook solicitou o código de autenticação de dois fatores (2FA). Insira o código enviado por SMS ou pelo seu aplicativo autenticador.",
                    "screenshot": self.capture_screenshot_base64()
                })
                user_res = self.wait_for_user_input(timeout=180)
                code = user_res.get("code")
                if code:
                    emit({"status": "submitting_code", "message": "Enviando código 2FA..."})
                    two_fa_input.fill(code)
                    submit_btn = self.page.locator('button#checkpointSubmitButton, button[type="submit"], button:has-text("Continuar"), button:has-text("Continue"), button:has-text("Continuer")').first
                    if submit_btn.is_visible():
                        submit_btn.click()
                    else:
                        two_fa_input.press("Enter")
                    time.sleep(4)
                continue

            # Verificação "Aprove em outro dispositivo / Aplicativo"
            if any(term in page_text for term in ["aprove em outro", "abra seu app", "check your notifications", "approve from another device", "confirmar sua identidade", "approuvez depuis un autre"]):
                emit({
                    "status": "waiting_device_approval",
                    "message": "O Facebook enviou uma solicitação de login para seu smartphone. Abra o app do Facebook no celular e toque em 'Aprovar' ou 'Sim'.",
                    "screenshot": self.capture_screenshot_base64()
                })
                continue

        if not self.running:
            return

        # Se expirou o loop sem sucesso
        if is_logged_in_by_cookies("facebook", self.context.cookies(), self.page.url):
            self._handle_success()
        else:
            emit({
                "status": "error",
                "message": "Tempo limite esgotado para login no Facebook.",
                "screenshot": self.capture_screenshot_base64()
            })

    # -------------------------------------------------------------
    # Fluxo Instagram
    # -------------------------------------------------------------
    def _handle_instagram_flow(self, username: str, password: str):
        emit({"status": "logging_in", "message": "Preenchendo credenciais no Instagram..."})

        try:
            user_input = self.page.locator('input[name="username"]').first
            user_input.fill(username, timeout=10000)

            pass_input = self.page.locator('input[name="password"]').first
            pass_input.fill(password, timeout=10000)

            submit_btn = self.page.locator('button[type="submit"]').first
            submit_btn.click(timeout=10000)
        except Exception as e:
            emit({
                "status": "error",
                "message": f"Erro nos campos do Instagram: {str(e)}",
                "screenshot": self.capture_screenshot_base64()
            })
            return

        emit({"status": "waiting", "message": "Aguardando resposta do Instagram..."})
        start_time = time.time()

        while time.time() - start_time < 90 and self.running:
            time.sleep(2)
            cur_cookies = self.context.cookies()

            if is_logged_in_by_cookies("instagram", cur_cookies, self.page.url):
                self._handle_success()
                return

            page_text = self.page.content().lower()
            if "sua senha está incorreta" in page_text or "password was incorrect" in page_text:
                emit({"status": "error", "message": "Usuário ou senha incorretos no Instagram."})
                return

            two_fa_input = self.page.locator('input[name="verificationCode"], input[name="security_code"]').first
            if two_fa_input.is_visible():
                emit({
                    "status": "needs_2fa",
                    "message": "Digite o código 2FA de 6 dígitos enviado para seu WhatsApp, SMS ou aplicativo autenticador.",
                    "screenshot": self.capture_screenshot_base64()
                })
                user_res = self.wait_for_user_input(timeout=180)
                code = user_res.get("code")
                if code:
                    two_fa_input.fill(code)
                    confirm_btn = self.page.locator('button[type="button"]:has-text("Confirmar"), button:has-text("Confirm"), button[type="submit"]').first
                    if confirm_btn.is_visible():
                        confirm_btn.click()
                    else:
                        two_fa_input.press("Enter")
                    time.sleep(4)
                continue

        if is_logged_in_by_cookies("instagram", self.context.cookies(), self.page.url):
            self._handle_success()
        else:
            emit({"status": "error", "message": "Tempo limite esgotado no Instagram.", "screenshot": self.capture_screenshot_base64()})

    # -------------------------------------------------------------
    # Fluxo Google / YouTube (com suporte a número de verificação na tela)
    # -------------------------------------------------------------
    def _handle_google_flow(self, username: str, password: str):
        emit({"status": "logging_in", "message": "Inserindo conta do Google / YouTube..."})

        try:
            email_input = self.page.locator('input[type="email"], input#identifierId').first
            email_input.fill(username, timeout=12000)
            
            next_btn = self.page.locator('#identifierNext, button:has-text("Avançar"), button:has-text("Next")').first
            next_btn.click(timeout=8000)
            time.sleep(3)

            pass_input = self.page.locator('input[type="password"], input[name="Passwd"], input[name="password"]').first
            pass_input.wait_for(state="visible", timeout=12000)
            pass_input.fill(password)

            pass_next = self.page.locator('#passwordNext, button:has-text("Avançar"), button:has-text("Next")').first
            pass_next.click(timeout=8000)
        except Exception as e:
            emit({
                "status": "error",
                "message": f"Erro nas etapas iniciais do Google: {str(e)}",
                "screenshot": self.capture_screenshot_base64()
            })
            return

        emit({"status": "waiting", "message": "Verificando autenticação do Google..."})
        start_time = time.time()

        while time.time() - start_time < 120 and self.running:
            time.sleep(2)
            cur_cookies = self.context.cookies()
            cur_url = self.page.url

            if is_logged_in_by_cookies("youtube", cur_cookies, cur_url):
                self._handle_success()
                return

            page_text = self.page.content().lower()

            # Senha errada
            if "senha incorreta" in page_text or "wrong password" in page_text:
                emit({"status": "error", "message": "Senha incorreta da Conta Google."})
                return

            # DESAFIO DE NÚMERO NA TELA (Google Prompt: "Toque no número X no seu celular")
            # O Google normalmente coloca o número em destaque num elemento div com role="presentation" ou data-number
            prompt_number = None
            try:
                # Procura elemento de número do Google Prompt
                num_elem = self.page.locator('[data-number], div[role="heading"] span, div.c3bY4b, div.luhg0').first
                if num_elem.is_visible():
                    txt = num_elem.inner_text().strip()
                    if txt.isdigit() and len(txt) <= 3:
                        prompt_number = txt
            except Exception:
                pass

            if ("toque no número" in page_text or "tap the number" in page_text or "toque em sim" in page_text or prompt_number):
                emit({
                    "status": "device_prompt",
                    "promptNumber": prompt_number or "Ver tela",
                    "message": f"Abra a notificação no seu celular e toque no número {prompt_number or ''} para confirmar.",
                    "screenshot": self.capture_screenshot_base64()
                })
                time.sleep(2)
                continue

            # Código 2FA via SMS ou Google Authenticator
            pin_input = self.page.locator('input#idvPinId, input[name="totpPin"], input[type="tel"]').first
            if pin_input.is_visible():
                emit({
                    "status": "needs_2fa",
                    "message": "Digite o código de verificação do Google enviado para seu celular ou Authenticator.",
                    "screenshot": self.capture_screenshot_base64()
                })
                user_res = self.wait_for_user_input(timeout=180)
                code = user_res.get("code")
                if code:
                    pin_input.fill(code)
                    submit_pin = self.page.locator('#idvPreregisteredPhoneNext, #totpNext, button:has-text("Avançar"), button:has-text("Next")').first
                    if submit_pin.is_visible():
                        submit_pin.click()
                    else:
                        pin_input.press("Enter")
                    time.sleep(4)
                continue

        if is_logged_in_by_cookies("youtube", self.context.cookies(), self.page.url):
            self._handle_success()
        else:
            emit({"status": "error", "message": "Tempo limite esgotado para login no YouTube/Google.", "screenshot": self.capture_screenshot_base64()})

    # -------------------------------------------------------------
    # Fluxo TikTok (QR Code ou Credenciais)
    # -------------------------------------------------------------
    def _handle_tiktok_qr(self):
        emit({"status": "waiting", "message": "Carregando QR Code do TikTok..."})
        try:
            self.page.goto("https://www.tiktok.com/login", timeout=30000, wait_until="domcontentloaded")
            time.sleep(3)

            # Localiza o QR Code
            qr_elem = self.page.locator('canvas, div[data-e2e="qr-code"], img[alt*="QR" i]').first
            qr_img = self.capture_screenshot_base64(qr_elem if qr_elem.is_visible() else None)

            emit({
                "status": "qr_code",
                "qrImage": qr_img,
                "message": "Abra o aplicativo TikTok no celular, vá em Perfil > Menu > Escanear QR Code e aponte para a imagem abaixo.",
            })

            start_time = time.time()
            while time.time() - start_time < 180 and self.running:
                time.sleep(2.5)
                if is_logged_in_by_cookies("tiktok", self.context.cookies(), self.page.url):
                    self._handle_success()
                    return

                # Atualiza QR Code se a tela recarregar
                if int(time.time() - start_time) % 15 == 0:
                    new_img = self.capture_screenshot_base64(qr_elem if qr_elem.is_visible() else None)
                    if new_img:
                        emit({"status": "qr_code_update", "qrImage": new_img})

            emit({"status": "error", "message": "Tempo limite de escaneamento do QR Code do TikTok expirou."})
        except Exception as e:
            emit({"status": "error", "message": f"Erro no QR Code do TikTok: {str(e)}"})

    def _handle_tiktok_credentials(self, username: str, password: str):
        emit({"status": "logging_in", "message": "Inserindo credenciais no TikTok..."})
        try:
            user_input = self.page.locator('input[name="username"], input[type="text"]').first
            user_input.fill(username, timeout=10000)
            pass_input = self.page.locator('input[type="password"]').first
            pass_input.fill(password, timeout=10000)
            self.page.locator('button[type="submit"]').first.click(timeout=10000)
            time.sleep(3)

            # TikTok frequentemente apresenta quebra-cabeça (captcha)
            page_text = self.page.content().lower()
            if "arraste" in page_text or "puzzle" in page_text or "captcha" in page_text:
                emit({
                    "status": "captcha_puzzle",
                    "message": "O TikTok solicitou verificação por quebra-cabeça. Recomendamos conectar usando o modo QR Code.",
                    "screenshot": self.capture_screenshot_base64()
                })
                return

            start_time = time.time()
            while time.time() - start_time < 60 and self.running:
                time.sleep(2)
                if is_logged_in_by_cookies("tiktok", self.context.cookies(), self.page.url):
                    self._handle_success()
                    return

        except Exception as e:
            emit({"status": "error", "message": f"Erro no login do TikTok: {str(e)}"})

    # -------------------------------------------------------------
    # Fluxo Genérico (Pinterest, Kwai, Threads)
    # -------------------------------------------------------------
    def _handle_generic_flow(self, username: str, password: str):
        emit({"status": "logging_in", "message": f"Preenchendo login para {self.platform.upper()}..."})
        try:
            user_input = self.page.locator('input[type="email"], input[name="username"], input[name="id"], input[type="text"]').first
            user_input.fill(username, timeout=10000)

            pass_input = self.page.locator('input[type="password"]').first
            pass_input.fill(password, timeout=10000)

            submit_btn = self.page.locator('button[type="submit"]').first
            submit_btn.click(timeout=10000)

            start_time = time.time()
            while time.time() - start_time < 60 and self.running:
                time.sleep(2)
                if is_logged_in_by_cookies(self.platform, self.context.cookies(), self.page.url):
                    self._handle_success()
                    return

            emit({"status": "error", "message": f"Tempo esgotado para {self.platform.upper()}.", "screenshot": self.capture_screenshot_base64()})
        except Exception as e:
            emit({"status": "error", "message": f"Erro ao logar em {self.platform}: {str(e)}"})

    # -------------------------------------------------------------
    # Finalização e Salvamento com Sucesso
    # -------------------------------------------------------------
    def _handle_success(self):
        cookies = self.context.cookies()
        cookie_file = SESSIONS_DIR / f"{self.platform}_cookies.json"
        with open(cookie_file, "w", encoding="utf-8") as f:
            json.dump(cookies, f, indent=2, ensure_ascii=False)

        # Se houver arquivo de expirado, remove
        expired_file = SESSIONS_DIR / f"{self.platform}_expired.json"
        if expired_file.exists():
            try: expired_file.unlink()
            except Exception: pass

        # Configurações extras específicas
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
    parser = argparse.ArgumentParser(description="Autenticador em Nuvem DarkTube")
    parser.add_argument("--platform", type=str, required=True)
    parser.add_argument("--mode", type=str, default="credentials")
    args = parser.parse_args()

    session = CloudAuthSession(platform=args.platform, mode=args.mode)

    # Thread que lê comandos do stdin (JSON-RPC)
    def stdin_listener():
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                cmd = data.get("command")
                if cmd == "start":
                    username = data.get("username", "")
                    password = data.get("password", "")
                    session_thread = threading.Thread(target=session.start, args=(username, password), daemon=True)
                    session_thread.start()
                elif cmd in ["submit_2fa", "submit_code"]:
                    session.receive_input(data)
                elif cmd == "cancel":
                    session.running = False
                    session.cleanup()
                    emit({"status": "cancelled", "message": "Autenticação cancelada pelo usuário."})
                    sys.exit(0)
            except Exception as e:
                emit({"status": "error", "message": f"Erro de comando stdin: {str(e)}"})

    listener_thread = threading.Thread(target=stdin_listener, daemon=True)
    listener_thread.start()

    # Mantém o processo vivo até a sessão terminar
    while session.running:
        time.sleep(0.5)

if __name__ == "__main__":
    main()
