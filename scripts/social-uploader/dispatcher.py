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
    facebook_page_id: str = None
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

    print("\n" + "=" * 65)
    print(f"🎬 [DESPACHANTE MULTICANAL DARKTUBE]")
    print(f"   Vídeo: {video_file.name} ({video_file.stat().st_size / (1024*1024):.2f} MB)")
    print(f"   Plataformas Alvo: {', '.join(active_platforms)}")
    if facebook_page_id:
        print(f"   Facebook Page Alvo: {facebook_page_id}")
    print("=" * 65 + "\n")

    results = {}
    for i, plat in enumerate(active_platforms):
        print(f"\n[{i+1}/{len(active_platforms)}] 🚀 Processando upload para: {plat.upper()}")

        try:
            if plat == "facebook":
                uploader = FacebookUploader()
                res = uploader.upload(
                    video_path=str(video_file),
                    caption=caption,
                    title=title,
                    link=link,
                    facebook_page_id=facebook_page_id
                )
            elif plat == "instagram":
                uploader = InstagramFacebookUploader()
                res = uploader.upload(
                    video_path=str(video_file),
                    caption=caption,
                    title=title,
                    link=link,
                    share_to_facebook=False
                )
            else:
                uploader_cls = UPLOADER_REGISTRY.get(plat)
                uploader = uploader_cls()
                res = uploader.upload(
                    video_path=str(video_file),
                    caption=caption,
                    title=title,
                    link=link,
                    video_url=video_url
                )

            results[plat] = res
            if res.get("success"):
                print(f"   ✅ {plat.upper()}: Publicado com sucesso!")
                if res.get("post_url"):
                    print(f"      🔗 URL: {res['post_url']}")
            else:
                print(f"   ❌ {plat.upper()}: Falha - {res.get('error')}")

        except Exception as e:
            results[plat] = {"success": False, "platform": plat, "error": str(e)}
            print(f"   ❌ {plat.upper()}: Erro inesperado - {e}")

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
        "--post-id",
        type=str,
        default="",
        help="ID da postagem no banco DarkTube para atualização automática de status"
    )

    args = parser.parse_args()

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
        facebook_page_id=args.facebook_page_id
    )

    # Se informado post_id e ao menos uma rede teve sucesso, atualiza status no banco
    if args.post_id and any(r.get("success") for r in results.values()):
        updated_db = False
        db_url = os.environ.get("DATABASE_URL")
        if db_url:
            try:
                import psycopg2
                conn = psycopg2.connect(db_url)
                cur = conn.cursor()
                cur.execute(
                    "UPDATE public.dark_clips_posts SET status = %s, published_at = NOW(), error_message = NULL WHERE id = %s",
                    ("published", args.post_id)
                )
                conn.commit()
                cur.close()
                conn.close()
                updated_db = True
                print(f"[*] ✅ Status da publicação {args.post_id} atualizado para 'published' no PostgreSQL!")
            except Exception as pg_err:
                print(f"[*] [!] Aviso ao atualizar status no PostgreSQL diretamente: {pg_err}")

        if not updated_db:
            base_site = os.environ.get("NEXTAUTH_URL") or os.environ.get("NEXT_PUBLIC_SITE_URL") or os.environ.get("NEXT_PUBLIC_APP_URL") or "http://localhost:3000"
            for candidate_base in [base_site, "http://localhost:3000", "http://127.0.0.1:3000"]:
                try:
                    import urllib.request
                    endpoint = f"{candidate_base.rstrip('/')}/api/dark-clips/schedule"
                    req = urllib.request.Request(
                        endpoint,
                        data=json.dumps({"action": "mark_published", "postId": args.post_id}).encode("utf-8"),
                        headers={"Content-Type": "application/json"}
                    )
                    urllib.request.urlopen(req, timeout=10)
                    print(f"[*] ✅ Status da publicação {args.post_id} atualizado para 'published' via {endpoint}!")
                    updated_db = True
                    break
                except Exception as upd_err:
                    pass
            if not updated_db:
                print(f"[*] [!] Não foi possível notificar o endpoint de status da publicação {args.post_id}.")

    # Se ao menos uma rede teve sucesso, retorna código 0
    if any(r.get("success") for r in results.values()):
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
