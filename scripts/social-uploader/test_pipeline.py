"""
test_pipeline.py - Diagnóstico e Verificação do Pipeline de Redes Sociais.

Verifica quais redes já possuem sessão configurada e testa a integridade dos módulos.
"""

import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from pathlib import Path
from config import SESSIONS_DIR, SUPPORTED_PLATFORMS

SESSION_MAP = {
    "tiktok": [SESSIONS_DIR / "tiktok_cookies.json"],
    "instagram": [SESSIONS_DIR / "instagram_session.json", SESSIONS_DIR / "instagram_cookies.json"],
    "facebook": [SESSIONS_DIR / "facebook_cookies.json", SESSIONS_DIR / "instagram_session.json"],
    "youtube": [SESSIONS_DIR / "youtube_credentials.json", SESSIONS_DIR / "youtube_cookies.json"],
    "pinterest": [SESSIONS_DIR / "pinterest_cookies.json"],
    "kwai": [SESSIONS_DIR / "kwai_cookies.json"],
    "threads": [SESSIONS_DIR / "threads_cookies.json"],
    "telegram": "Variáveis TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID no .env"
}

def check_status():
    print("\n" + "=" * 65)
    print(" [STATUS DAS CONTAS - PIPELINE SOCIAL DARKTUBE]")
    print("=" * 65)

    for platform in SUPPORTED_PLATFORMS:
        target = SESSION_MAP.get(platform)
        if platform == "telegram":
            from config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
            ready = bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)
            status_str = "[OK] PRONTO (.env configurado)" if ready else "[!] PENDENTE (Adicione TELEGRAM_BOT_TOKEN no .env)"
        else:
            ready = any(f.exists() for f in target) if isinstance(target, list) else False
            found_name = next((f.name for f in target if f.exists()), "")
            status_str = f"[OK] PRONTO ({found_name})" if ready else f"[!] PENDENTE (Execute: python auth_manager.py --network {platform})"

        print(f"  * {platform.upper():<12} : {status_str}")

    print("=" * 65 + "\n")

if __name__ == "__main__":
    check_status()
