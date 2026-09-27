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
    # Se video_path for uma URL ou rota relativa (/api/storage/...), baixa para arquivo local
    temp_downloaded_file = None
    if video_path.startswith("http://") or video_path.startswith("https://") or video_path.startswith("/api/"):
        target_url = video_path if video_path.startswith("http") else f"http://localhost:3000{video_path}"
        print(f"[*] Baixando vídeo para arquivo local de: {target_url}...")
        try:
            import urllib.request
            temp_dir = SESSIONS_DIR / "temp"
            temp_dir.mkdir(parents=True, exist_ok=True)
            temp_downloaded_file = temp_dir / f"dispatch_{int(time.time())}.mp4"
            urllib.request.urlretrieve(target_url, str(temp_downloaded_file))
            video_file = temp_downloaded_file
            print(f"[*] Vídeo baixado com sucesso ({video_file.stat().st_size / (1024*1024):.2f} MB): {video_file.name}")
        except Exception as dl_err:
            raise FileNotFoundError(f"Erro ao baixar vídeo da URL {target_url}: {dl_err}")
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
        try:
            import urllib.request
            req = urllib.request.Request(
                "http://localhost:3000/api/dark-clips/schedule",
                data=json.dumps({"action": "mark_published", "postId": args.post_id}).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            urllib.request.urlopen(req, timeout=10)
            print(f"[*] ✅ Status da publicação {args.post_id} atualizado para 'published' no banco!")
        except Exception as upd_err:
            print(f"[*] [!] Aviso ao atualizar status no banco: {upd_err}")

    # Se ao menos uma rede teve sucesso, retorna código 0
    if any(r.get("success") for r in results.values()):
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
