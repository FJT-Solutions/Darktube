"""
auth_manager.py - Gerenciador de Autenticação e Exportador de Cookies (Zero Aprovação)

Permite fazer login 1 única vez em cada rede social abrindo o navegador real,
detecta automaticamente quando você concluiu o login (ou quando fecha a janela),
e salva os cookies de sessão para reutilização 100% autônoma e em segundo plano.
"""

import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
import json
import argparse
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

from config import SESSIONS_DIR, DEFAULT_USER_AGENT, YOUTUBE_CLIENT_SECRETS_FILE, YOUTUBE_CREDENTIALS_FILE

LOGIN_URLS = {
    "tiktok": "https://www.tiktok.com/login",
    "instagram": "https://www.instagram.com/accounts/login/",
    "facebook": "https://www.facebook.com/login/",
    "pinterest": "https://www.pinterest.com/login/",
    "kwai": "https://creator.kwai.com/",
    "threads": "https://www.threads.net/login",
    "youtube": "https://studio.youtube.com/"
}

def is_logged_in_by_cookies(network: str, cookies: list, current_url: str) -> bool:
    """Verifica se os cookies ou URL atual indicam que o login foi concluído com sucesso."""
    cookie_dict = {c.get("name"): c.get("value") for c in cookies}
    url_lower = (current_url or "").lower()

    if network == "tiktok":
        # TikTok autenticado TEM que ter sessionid ou sessionid_ss
        return bool(cookie_dict.get("sessionid") or cookie_dict.get("sessionid_ss"))

    if network in ["instagram", "threads"]:
        # Instagram/Threads autenticado TEM que ter sessionid e ds_user_id
        return bool(cookie_dict.get("sessionid") and cookie_dict.get("ds_user_id"))

    if network == "facebook":
        # Facebook autenticado TEM que ter c_user (ID numérico do perfil) e xs
        return bool(cookie_dict.get("c_user") and cookie_dict.get("xs"))

    if network == "pinterest":
        # Pinterest: _auth="0" significa deslogado! Quando logado vira _auth="1"
        return cookie_dict.get("_auth") == "1"

    if network == "kwai":
        return ("login" not in url_lower and "creator.kwai.com" in url_lower and bool(cookie_dict.get("userId") or cookie_dict.get("kwai_creator_token") or "dashboard" in url_lower))

    if network == "youtube":
        return ("accounts.google.com" not in url_lower and bool(cookie_dict.get("SAPISID") or cookie_dict.get("LOGIN_INFO")))

    return False


def capture_cookies_via_browser(network: str):
    """Abre o navegador visível, aguarda o usuário logar e salva os cookies automaticamente."""
    target_url = LOGIN_URLS.get(network)
    if not target_url:
        print(f"[ERRO] Rede desconhecida para login via navegador: {network}")
        return False

    cookie_file = SESSIONS_DIR / f"{network}_cookies.json"
    print(f"\n=======================================================")
    print(f"🚀 INICIANDO LOGIN PARA: {network.upper()}")
    print(f"=======================================================")
    print(f"1. Uma janela do navegador foi aberta em: {target_url}")
    print(f"2. Faça seu login normalmente (usuário/senha ou QR Code).")
    print(f"3. O sistema detecta o login e salva automaticamente!")
    print(f"-------------------------------------------------------\n")

    with sync_playwright() as p:
        # Tenta usar o Chrome instalado no Windows para máxima compatibilidade
        chrome_path = Path("C:/Program Files/Google/Chrome/Application/chrome.exe")
        chrome_x86 = Path("C:/Program Files (x86)/Google/Chrome/Application/chrome.exe")
        executable_path = None
        if chrome_path.exists():
            executable_path = str(chrome_path)
        elif chrome_x86.exists():
            executable_path = str(chrome_x86)

        user_data_dir = SESSIONS_DIR / "profiles" / network
        user_data_dir.mkdir(parents=True, exist_ok=True)

        context = p.chromium.launch_persistent_context(
            user_data_dir=str(user_data_dir),
            headless=False,
            executable_path=executable_path,
            no_viewport=True,
            user_agent=DEFAULT_USER_AGENT,
            args=[
                "--start-maximized", 
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox"
            ]
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        """)

        # Carrega cookies existentes se já houver
        if cookie_file.exists():
            try:
                with open(cookie_file, "r", encoding="utf-8") as f:
                    old_cookies = json.load(f)
                    context.add_cookies(old_cookies)
                    print(f"[*] Cookies anteriores carregados de {cookie_file.name}")
            except Exception as e:
                print(f"[!] Aviso ao carregar cookies anteriores: {e}")

        try:
            page.goto(target_url, timeout=45000)
        except Exception as e:
            print(f"[!] Aviso ao carregar URL inicial: {e}")

        print(f"[*] Janela aberta com sucesso. Aguardando login...")

        # Loop inteligente de espera: aguarda login ou até a janela ser fechada
        # Tempo limite máximo de 10 minutos (600 segundos)
        max_wait_seconds = 600
        start_time = time.time()
        login_detected = False

        while time.time() - start_time < max_wait_seconds:
            try:
                # Se a página foi fechada pelo usuário, encerra o loop e salva
                if page.is_closed():
                    print("[*] Janela fechada pelo usuário.")
                    break

                current_cookies = context.cookies()
                current_url = page.url

                if is_logged_in_by_cookies(network, current_cookies, current_url):
                    print(f"\n🎉 LOGIN DETECTADO COM SUCESSO PARA {network.upper()}!")
                    login_detected = True
                    # Dá um pequeno delay de 2 segundos para o site terminar de assentar os cookies
                    time.sleep(2)
                    break

            except Exception as loop_err:
                # Janela pode ter sido fechada abruptamente
                print(f"[*] Detalhe do monitor: {loop_err}")
                break

            time.sleep(1.5)

        # Salva os cookies SOMENTE se o login foi realmente confirmado
        try:
            final_cookies = context.cookies()
            final_url = page.url if not page.is_closed() else ""
            if not login_detected:
                login_detected = is_logged_in_by_cookies(network, final_cookies, final_url)

            if login_detected and final_cookies:
                with open(cookie_file, "w", encoding="utf-8") as f:
                    json.dump(final_cookies, f, indent=2, ensure_ascii=False)

                print(f"✅ SUCESSO! Login confirmado e {len(final_cookies)} cookies salvos para {network.upper()}:")
                print(f"   📂 {cookie_file}")

                # Se for Instagram ou Facebook, também tenta instagrapi
                if network in ["instagram", "facebook"]:
                    try_save_instagrapi_session(final_cookies)

                # Se for Facebook, sincroniza automaticamente as páginas gerenciadas
                if network == "facebook":
                    try:
                        import subprocess
                        import sys
                        get_pages_script = Path(__file__).parent / "get_facebook_pages.py"
                        if get_pages_script.exists():
                            print("[*] Sincronizando páginas do Facebook em segundo plano...")
                            subprocess.Popen([sys.executable, str(get_pages_script)])
                    except Exception as fb_err:
                        print(f"[!] Erro ao sincronizar páginas pós-login: {fb_err}")
            else:
                print(f"[*] Janela fechada sem login em {network.upper()}. Nenhuma sessão salva.")
        except Exception as save_err:
            print(f"[!] Erro ao verificar/salvar cookies: {save_err}")

        try:
            context.close()
        except Exception:
            pass

    return True


def try_save_instagrapi_session(cookies: list):
    """Converte os cookies do Instagram para a sessão instagrapi."""
    session_id = None
    for cookie in cookies:
        if cookie.get("name") == "sessionid":
            session_id = cookie.get("value")
            break

    if session_id:
        insta_session_file = SESSIONS_DIR / "instagram_session.json"
        try:
            from instagrapi import Client
            cl = Client()
            cl.login_by_sessionid(session_id)
            cl.dump_settings(str(insta_session_file))
            print(f"✅ Sessão móvel configurada:")
            print(f"   📂 {insta_session_file}")
        except Exception as e:
            print(f"[*] Sessão salva via cookies web. Nota instagrapi: {e}")


def setup_youtube_oauth():
    """Configura autenticação do YouTube. Se houver client_secrets, faz OAuth; se não, usa cookies."""
    secrets_path = Path(YOUTUBE_CLIENT_SECRETS_FILE)
    if secrets_path.exists():
        try:
            from google_auth_oauthlib.flow import InstalledAppFlow
            SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
            flow = InstalledAppFlow.from_client_secrets_file(str(secrets_path), SCOPES)
            creds = flow.run_local_server(port=0)

            with open(YOUTUBE_CREDENTIALS_FILE, "w", encoding="utf-8") as token_file:
                token_file.write(creds.to_json())

            print(f"✅ Token do YouTube Shorts gerado com sucesso!")
            print(f"   📂 {YOUTUBE_CREDENTIALS_FILE}")
            return True
        except Exception as e:
            print(f"[ERRO] Falha ao autenticar no YouTube via OAuth: {e}")

    # Fallback: abre login do YouTube Studio via navegador para capturar cookies
    print(f"[*] Abrindo login do YouTube Studio no navegador...")
    return capture_cookies_via_browser("youtube")


def main():
    parser = argparse.ArgumentParser(description="Gerenciador de Login Único para Redes Sociais")
    parser.add_argument(
        "--network", 
        type=str, 
        choices=["tiktok", "instagram", "facebook", "pinterest", "kwai", "threads", "youtube", "all"],
        required=True,
        help="Rede social para realizar login e capturar cookies/sessão"
    )
    args = parser.parse_args()

    if args.network == "youtube":
        setup_youtube_oauth()
    elif args.network == "all":
        for net in LOGIN_URLS.keys():
            capture_cookies_via_browser(net)
    else:
        capture_cookies_via_browser(args.network)


if __name__ == "__main__":
    main()
