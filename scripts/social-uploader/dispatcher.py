"""
dispatcher.py - Despachante Central de Uploads em Redes Sociais (Zero Aprovação)

Orquestra a publicação multicanal nos feeds de forma autônoma e em segundo plano.
Pode ser chamado diretamente via linha de comando ou disparado pelo server.js do DarkTube.
"""

import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
import os
import json
import time
import argparse
from pathlib import Path
from typing import List, Dict, Any

try:
    from dotenv import load_dotenv
    root_dir = Path(__file__).resolve().parent.parent.parent
    load_dotenv(root_dir / ".env.local")
    load_dotenv(root_dir / ".env")
except Exception:
    pass

current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from config import SUPPORTED_PLATFORMS, DEFAULT_STAGGER_DELAY_SECONDS, SESSIONS_DIR
from uploaders import (
    TikTokUploader,
    InstagramFacebookUploader,
    FacebookUploader,
    YouTubeUploader,
    PinterestUploader,
    KwaiUploader,
    ThreadsUploader,
    TelegramUploader
)

UPLOADER_REGISTRY = {
    "tiktok": TikTokUploader,
    "instagram": InstagramFacebookUploader,
    "facebook": FacebookUploader,
    "youtube": YouTubeUploader,
    "pinterest": PinterestUploader,
    "kwai": KwaiUploader,
    "threads": ThreadsUploader,
    "telegram": TelegramUploader
}

def dispatch_uploads(
    video_path: str,
    caption: str,
    title: str = None,
    link: str = None,
    platforms: List[str] = None,
    video_url: str = None,
    delay_seconds: int = DEFAULT_STAGGER_DELAY_SECONDS,
    facebook_page_id: str = None,
    account_map: Dict[str, Any] = None
) -> Dict[str, Any]:
    # Se video_path for um arquivo local existente no disco, usa diretamente
    if Path(video_path).is_file():
        video_file = Path(video_path).resolve()
    elif video_path.startswith("http://") or video_path.startswith("https://") or video_path.startswith("/api/"):
        base_site = os.environ.get("NEXTAUTH_URL") or os.environ.get("NEXT_PUBLIC_SITE_URL") or os.environ.get("NEXT_PUBLIC_APP_URL") or "http://localhost:3000"
        target_url = video_path if video_path.startswith("http") else f"{base_site.rstrip('/')}{video_path if video_path.startswith('/') else '/' + video_path}"
        print(f"[*] Baixando vídeo para arquivo local de: {target_url}...")
        try:
            import urllib.request
            temp_dir = SESSIONS_DIR / "temp"
            temp_dir.mkdir(parents=True, exist_ok=True)
            temp_downloaded_file = temp_dir / f"dispatch_{int(time.time())}.mp4"
            urllib.request.urlretrieve(target_url, str(temp_downloaded_file))
            if not temp_downloaded_file.exists() or temp_downloaded_file.stat().st_size < 10000:
                size_b = temp_downloaded_file.stat().st_size if temp_downloaded_file.exists() else 0
                raise ValueError(f"Arquivo baixado inválido ({size_b} bytes) de {target_url}. Verifique se o vídeo foi renderizado com sucesso.")
            video_file = temp_downloaded_file
            print(f"[*] Vídeo baixado com sucesso ({video_file.stat().st_size / (1024*1024):.2f} MB): {video_file.name}")
        except Exception as dl_err:
            raise FileNotFoundError(f"Erro ao obter vídeo para upload: {dl_err}")
    else:
        video_file = Path(video_path).resolve()
        if not video_file.exists():
            raise FileNotFoundError(f"Vídeo não encontrado para upload: {video_file}")

    if not platforms:
        platforms = SUPPORTED_PLATFORMS

    active_platforms = []
    for p in platforms:
        p_clean = p.strip().lower()
        if p_clean in UPLOADER_REGISTRY and p_clean not in active_platforms:
            active_platforms.append(p_clean)

    account_map = account_map or {}

    print("\n" + "=" * 65)
    print(f"🎬 [DESPACHANTE MULTICANAL DARKTUBE - MULTI-CONTAS]")
    print(f"   Vídeo: {video_file.name} ({video_file.stat().st_size / (1024*1024):.2f} MB)")
    print(f"   Plataformas Alvo: {', '.join(active_platforms)}")
    if facebook_page_id:
        print(f"   Facebook Page Alvo: {facebook_page_id}")
    if account_map:
        print(f"   Mapeamento de Contas: {account_map}")
    print("=" * 65 + "\n")

    results = {}
    for i, plat in enumerate(active_platforms):
        acc_target = account_map.get(plat)
        # acc_target pode ser uma lista de IDs, uma string única ou 'all'
        acc_list = []
        if isinstance(acc_target, list):
            acc_list = acc_target
        elif isinstance(acc_target, str) and acc_target and acc_target != "all":
            acc_list = [acc_target]
        elif acc_target == "all":
            found_accs = []
            if (SESSIONS_DIR / f"{plat}_cookies.json").exists():
                found_accs.append("default")
            for f in SESSIONS_DIR.glob(f"{plat}_*_cookies.json"):
                stem = f.stem
                prefix = f"{plat}_"
                if stem.startswith(prefix):
                    remainder = stem[len(prefix):]
                    if remainder.endswith("_cookies"):
                        remainder = remainder[:-8]
                    if remainder and remainder not in found_accs:
                        found_accs.append(remainder)
            acc_list = found_accs if found_accs else ["default"]
        else:
            acc_list = ["default"]

        for acc_id in acc_list:
            acc_label = f"{plat.upper()} ({acc_id})" if acc_id != "default" else plat.upper()
            print(f"\n[{i+1}/{len(active_platforms)}] 🚀 Processando upload para: {acc_label}")

            custom_cookie_file = None
            if acc_id and acc_id != "default":
                cand = SESSIONS_DIR / f"{plat}_{acc_id}_cookies.json"
                if cand.exists():
                    custom_cookie_file = cand

            try:
                if plat == "facebook":
                    uploader = FacebookUploader(cookie_file=custom_cookie_file)
                    res = uploader.upload(
                        video_path=str(video_file),
                        caption=caption,
                        title=title,
                        link=link,
                        facebook_page_id=facebook_page_id
                    )
                elif plat == "instagram":
                    uploader = InstagramFacebookUploader(cookie_file=custom_cookie_file)
                    res = uploader.upload(
                        video_path=str(video_file),
                        caption=caption,
                        title=title,
                        link=link,
                        share_to_facebook=False
                    )
                else:
                    uploader_cls = UPLOADER_REGISTRY.get(plat)
                    uploader = uploader_cls(cookie_file=custom_cookie_file) if custom_cookie_file else uploader_cls()
                    res = uploader.upload(
                        video_path=str(video_file),
                        caption=caption,
                        title=title,
                        link=link,
                        video_url=video_url
                    )

                res_key = f"{plat}_{acc_id}" if acc_id != "default" else plat
                results[res_key] = res
                if res.get("success"):
                    print(f"   ✅ {acc_label}: Publicado com sucesso!")
                    if res.get("post_url"):
                        print(f"      🔗 URL: {res['post_url']}")
                else:
                    print(f"   ❌ {acc_label}: Falha - {res.get('error')}")

            except Exception as e:
                res_key = f"{plat}_{acc_id}" if acc_id != "default" else plat
                results[res_key] = {"success": False, "platform": plat, "error": str(e)}
                print(f"   ❌ {acc_label}: Erro inesperado - {e}")

        # Aplica intervalo humano entre uploads (exceto no último)
        if i < len(active_platforms) - 1 and delay_seconds > 0:
            print(f"   ⏳ Aguardando {delay_seconds}s de intervalo humano antes da próxima rede...")
            time.sleep(delay_seconds)

    print("\n" + "=" * 65)
    print("📊 [RELATÓRIO CONSOLIDADO DE UPLOADS]")
    success_count = sum(1 for r in results.values() if r.get("success"))
    print(f"   Status: {success_count}/{len(results)} redes publicadas com sucesso.")
    print("=" * 65 + "\n")

    return results


def update_post_status(post_id: str, status: str, error_message: str = None) -> bool:
    if not post_id:
        return False
    # 1. Direct PostgreSQL
    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        try:
            import psycopg2
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            if status == "published":
                cur.execute(
                    "UPDATE public.dark_clips_posts SET status = %s, published_at = NOW(), error_message = NULL WHERE id::text = %s",
                    ("published", str(post_id))
                )
            else:
                cur.execute(
                    "UPDATE public.dark_clips_posts SET status = %s, error_message = %s WHERE id::text = %s",
                    (status, (error_message or "")[:500], str(post_id))
                )
            conn.commit()
            cur.close()
            conn.close()
            print(f"[*] ✅ Status da publicação {post_id} atualizado para '{status}' no PostgreSQL!")
            return True
        except Exception as pg_err:
            print(f"[*] [!] Aviso ao atualizar status no PostgreSQL diretamente: {pg_err}", file=sys.stderr)

    # 2. HTTP Fallback
    base_site = os.environ.get("NEXTAUTH_URL") or os.environ.get("NEXT_PUBLIC_SITE_URL") or os.environ.get("NEXT_PUBLIC_APP_URL") or "http://localhost:3000"
    for candidate_base in [base_site, "http://localhost:3000", "http://127.0.0.1:3000"]:
        try:
            import urllib.request
            import ssl
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            endpoint = f"{candidate_base.rstrip('/')}/api/dark-clips/schedule"
            action = "mark_published" if status == "published" else "mark_failed"
            payload = {"action": action, "postId": post_id}
            if error_message:
                payload["error"] = error_message[:500]
            req = urllib.request.Request(
                endpoint,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            urllib.request.urlopen(req, context=ctx, timeout=10)
            print(f"[*] ✅ Status da publicação {post_id} atualizado para '{status}' via {endpoint}!")
            return True
        except Exception:
            pass
    return False


def main():
    parser = argparse.ArgumentParser(description="Despachante Autônomo de Redes Sociais do DarkTube")
    parser.add_argument("--video", type=str, required=True, help="Caminho do arquivo de vídeo .mp4")
    parser.add_argument("--caption", type=str, required=True, help="Texto da legenda e hashtags")
    parser.add_argument("--title", type=str, default="", help="Título do vídeo (usado no YouTube e Pinterest)")
    parser.add_argument("--link", type=str, default="", help="Link de destino externo (usado no Pinterest e Telegram)")
    parser.add_argument("--video-url", type=str, default="", help="URL pública do vídeo (usada no Threads API)")
    parser.add_argument(
        "--platforms", 
        type=str, 
        default="all", 
        help="Lista de redes separadas por vírgula (ex: tiktok,instagram,youtube) ou 'all'"
    )
    parser.add_argument(
        "--delay", 
        type=int, 
        default=DEFAULT_STAGGER_DELAY_SECONDS, 
        help="Segundos de intervalo entre redes"
    )
    parser.add_argument(
        "--facebook-page-id",
        type=str,
        default="",
        help="ID ou slug da página específica do Facebook para publicação"
    )
    parser.add_argument(
        "--account-map",
        type=str,
        default="{}",
        help="Mapeamento JSON de plataforma para conta específica ou lista de contas"
    )
    parser.add_argument(
        "--post-id",
        type=str,
        default="",
        help="ID da postagem no banco DarkTube para atualização automática de status"
    )

    args = parser.parse_args()

    account_map = {}
    if getattr(args, "account_map", None):
        try:
            account_map = json.loads(args.account_map)
        except Exception:
            pass

    if args.platforms == "all":
        platforms_list = SUPPORTED_PLATFORMS
    else:
        platforms_list = [p.strip() for p in args.platforms.split(",") if p.strip()]

    results = dispatch_uploads(
        video_path=args.video,
        caption=args.caption,
        title=args.title,
        link=args.link,
        platforms=platforms_list,
        video_url=args.video_url,
        delay_seconds=args.delay,
        facebook_page_id=args.facebook_page_id,
        account_map=account_map
    )

    # Se informado post_id e ao menos uma rede teve sucesso, atualiza status no banco
    if args.post_id and any(r.get("success") for r in results.values()):
        update_post_status(args.post_id, "published")
    elif args.post_id and not any(r.get("success") for r in results.values()):
        errors_summary = "; ".join(f"{p}: {r.get('error', 'Falha desconhecida')}" for p, r in results.items())
        update_post_status(args.post_id, "failed", errors_summary)

    # Se ao menos uma rede teve sucesso, retorna código 0
    if any(r.get("success") for r in results.values()):
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except SystemExit as exit_err:
        sys.exit(exit_err.code)
    except Exception as fatal_err:
        import traceback
        traceback.print_exc()
        print(f"\n[FATAL ERROR] Falha no despachante: {fatal_err}", file=sys.stderr)
        
        # Extrai post_id da linha de comando se houver
        p_id = ""
        for idx, arg in enumerate(sys.argv):
            if arg == "--post-id" and idx + 1 < len(sys.argv):
                p_id = sys.argv[idx + 1]
                break
        
        if p_id:
            err_msg = str(fatal_err) if str(fatal_err) else "Erro fatal na execução do despachante Python"
            update_post_status(p_id, "failed", err_msg)
        
        sys.exit(1)

