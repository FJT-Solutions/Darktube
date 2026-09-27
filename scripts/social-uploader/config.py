import os
from pathlib import Path
from dotenv import load_dotenv

# Carrega variáveis de ambiente do .env na raiz do darktube se existir
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent.parent
load_dotenv(PROJECT_ROOT / ".env")

# Diretório onde os cookies de sessão são armazenados com segurança
SESSIONS_DIR = BASE_DIR / "sessions"
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)

# Plataformas suportadas
SUPPORTED_PLATFORMS = [
    "tiktok",
    "instagram",
    "facebook",
    "youtube",
    "pinterest",
    "kwai",
    "threads",
    "telegram"
]

# Configurações do Telegram
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# Configurações do Threads (Meta API ou Cookies)
THREADS_USER_ID = os.getenv("THREADS_USER_ID", "")
THREADS_ACCESS_TOKEN = os.getenv("THREADS_ACCESS_TOKEN", "")

# Configurações do YouTube
YOUTUBE_CLIENT_SECRETS_FILE = os.getenv(
    "YOUTUBE_CLIENT_SECRETS_FILE", 
    str(SESSIONS_DIR / "youtube_client_secrets.json")
)
YOUTUBE_CREDENTIALS_FILE = str(SESSIONS_DIR / "youtube_credentials.json")

# User Agent padrão para navegadores Playwright (Chrome moderno Windows)
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)

# Intervalo padrão de segurança entre postagens (em segundos)
DEFAULT_STAGGER_DELAY_SECONDS = int(os.getenv("SOCIAL_STAGGER_DELAY_SECONDS", "30"))
