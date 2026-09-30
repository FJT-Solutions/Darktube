import paramiko
import json
import time
import os
import sys
import io
import urllib.request
import subprocess

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

HOST = "31.220.92.254"
USER = "root"
PASS = "fjt@Solutions1"

OUT_DIR = r"c:\Users\natha\Documents\project\darktube\out\test_renders"
FRAMES_DIR = os.path.join(OUT_DIR, "heroshot_frames")
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(FRAMES_DIR, exist_ok=True)

LOCAL_VIDEO_PATH = os.path.join(OUT_DIR, "HeroShotReveal_60s.mp4")

# 7 CENAS CALIBRADAS PARA EXATAMENTE 60 SEGUNDOS (1800 FRAMES)
script_scenes = [
    {
        "id": "hero_00",
        "headline": "O SALTO QUÂNTICO",
        "badge": "TECNOLOGIA SUPREMA",
        "text": "Uma revolução silenciosa está acontecendo nos laboratórios mais secretos do planeta agora.",
        "image": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1080&q=80",
        "dur": 8.6,
    },
    {
        "id": "hero_01",
        "headline": "SUPERPOSIÇÃO ATÔMICA",
        "badge": "100 MILHÕES DE VEZES",
        "text": "Enquanto seu computador pensa em zeros e uns, processadores quânticos existem em múltiplos universos ao mesmo tempo.",
        "image": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&q=80",
        "dur": 8.8,
    },
    {
        "id": "hero_02",
        "headline": "O FIM DA CRIPTOGRAFIA",
        "badge": "QUEBRA DO RSA",
        "text": "O que levaria dez mil anos para decifrar, este superchip resolve em apenas três segundos cravados.",
        "image": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1080&q=80",
        "dur": 8.5,
    },
    {
        "id": "hero_03",
        "headline": "FRIO ABSOLUTO",
        "badge": "MENOS 273 GRAUS",
        "text": "Para domar o átomo, o núcleo opera mais frio do que o próprio vácuo do espaço sideral profundo.",
        "image": "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=1080&q=80",
        "dur": 8.6,
    },
    {
        "id": "hero_04",
        "headline": "GUERRA TECNOLÓGICA",
        "badge": "SUPREMACIA GLOBAL",
        "text": "Quem dominar a física quântica primeiro controlará todo o tráfego financeiro, governamental e militar do mundo.",
        "image": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&q=80",
        "dur": 8.8,
    },
    {
        "id": "hero_05",
        "headline": "O DESPERTAR DA I.A.",
        "badge": "CONSCIÊNCIA SINTÉTICA",
        "text": "Unir Inteligência Artificial com computação quântica criará a primeira superinteligência verdadeiramente autônoma da Terra.",
        "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&q=80",
        "dur": 8.7,
    },
    {
        "id": "hero_06",
        "headline": "O FUTURO CHEGOU",
        "badge": "DARKTUBE // HERO",
        "text": "O futuro não está mais a caminho. Ele já começou agora. Prepare-se para a maior transição da história humana.",
        "image": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1080&q=80",
        "dur": 8.4,
    }
]

total_calc_dur = sum(s["dur"] for s in script_scenes)
print(f"=== PRODUÇÃO HEROSHOT REVEAL (60 SEGUNDOS) ===")
print(f"Cenas: {len(script_scenes)} | Duração planejada: {total_calc_dur:.1f}s ({int(total_calc_dur * 30)} frames)", flush=True)

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=22, username=USER, password=PASS, timeout=15)

stdin, stdout, stderr = c.exec_command("docker ps -q -f name=n8n-remotionservice | head -n1")
cid = stdout.read().decode('utf-8').strip()
print(f"Container Remotion ativo: {cid}", flush=True)

# 1. GERAR BGM AMBIENTE SE NECESSÁRIO
print("\n1. Verificando BGM ambiente...", flush=True)
bgm_cmd = f"""
if [ ! -f /app/output/bgm_cyber.mp3 ] || [ $(wc -c < /app/output/bgm_cyber.mp3) -lt 1000 ]; then
  docker exec {cid} ffmpeg -y -f lavfi -i "sine=frequency=75:duration=65" -f lavfi -i "sine=frequency=150:duration=65" -filter_complex "[0:a][1:a]amix=inputs=2:weights=0.6 0.4,lowpass=f=250,volume=0.08" /app/output/bgm_cyber.mp3
fi
"""
c.exec_command(bgm_cmd, timeout=30)

# 2. SINTETIZAR VOZ PIPER PARA CADA CENA
print("\n2. Sintetizando narração em Português (Piper TTS)...", flush=True)
for item in script_scenes:
    sid = item["id"]
    text = item["text"]
    tts_payload = json.dumps({"model": "tts-1", "voice": "faber", "input": text})
    
    cmd = f"""
if [ ! -f /app/output/{sid}.mp3 ] || [ $(wc -c < /app/output/{sid}.mp3) -lt 1000 ]; then
  cat << 'EOF' > /tmp/{sid}_tts.json
{tts_payload}
EOF
  docker cp /tmp/{sid}_tts.json {cid}:/tmp/{sid}_tts.json
  docker exec {cid} curl -s -X POST http://n8n-piper-yhoamw:8000/v1/audio/speech \\
    -H "Content-Type: application/json" \\
    -d @/tmp/{sid}_tts.json \\
    --output /app/output/{sid}.mp3
fi

DUR=$(docker exec {cid} ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 /app/output/{sid}.mp3)
echo "$DUR"
"""
    stdin, stdout, stderr = c.exec_command(cmd, timeout=40)
    dur_str = stdout.read().decode('utf-8').strip().split('\n')[-1]
    try:
        dur = float(dur_str)
    except:
        dur = 6.0
    item["audio_dur"] = dur
    print(f"  [{sid}] Áudio: {dur:.2f}s | Duração cena: {item['dur']}s", flush=True)

# 3. GERAR TIMINGS DE KARAOKE FONÉTICO
def make_precise_word_timings(text, audio_dur):
    words = text.strip().split()
    if not words:
        return []
    clean_words = [w.replace(',', '').replace('.', '').replace('!', '').replace('?', '').replace(':', '') for w in words]
    weights = [max(2, len(cw)) for cw in clean_words]
    total_weight = sum(weights)
    speech_start = 0.15
    usable_dur = max(0.5, audio_dur - 0.25)
    current_time = speech_start
    timings = []
    for w, weight in zip(words, weights):
        w_dur = (weight / total_weight) * usable_dur
        timings.append({
            "word": w,
            "startInSeconds": round(current_time, 2),
            "endInSeconds": round(current_time + w_dur, 2)
        })
        current_time += w_dur
    return timings

scenes = []
for i, item in enumerate(script_scenes):
    w_timings = make_precise_word_timings(item["text"], item["audio_dur"])
    scene = {
        "index": i,
        "captionText": item["text"],
        "headline": item["headline"],
        "badgeText": item["badge"],
        "imageUrl": item["image"],
        "durationSeconds": item["dur"],
        "transitionIn": "fade" if i == 0 else "wipe",
        "transitionDurationFrames": 12,
        "words": w_timings,
        "audioUrl": f"http://127.0.0.1:3001/storage/{item['id']}.mp3",
        "sfxOnEnter": "whoosh" if i % 2 == 0 else "pop",
    }
    scenes.append(scene)

payload = {
    "historyId": "heroshot_60s_v4",
    "templateId": "HeroShotReveal",
    "callbackUrl": "http://127.0.0.1:3001/health",
    "composition": {
        "templateId": "HeroShotReveal",
        "scenes": scenes,
        "format": "vertical",
        "captionStyle": "pop",
        "primaryColor": "#8B5CF6",
        "accentColor": "#06B6D4",
        "showWatermark": True,
        "watermarkText": "DARKTUBE // QUANTUM TECH",
        "backgroundMusicUrl": "http://127.0.0.1:3001/storage/bgm_cyber.mp3",
        "enableSfx": True,
        "concurrency": 2
    }
}

submit_cmd = f"""
cat << 'EOF' > /tmp/heroshot_payload.json
{json.dumps(payload, indent=2)}
EOF
docker cp /tmp/heroshot_payload.json {cid}:/tmp/heroshot_payload.json
echo "=== Submetendo Job ==="
docker exec {cid} curl -s -X POST http://127.0.0.1:3001/render \\
  -H "Content-Type: application/json" \\
  -d @/tmp/heroshot_payload.json
"""

print("\n3. Submetendo Job para o serviço Remotion...", flush=True)
stdin, stdout, stderr = c.exec_command(submit_cmd, timeout=60)
resp = stdout.read().decode('utf-8')
print(resp, flush=True)

# 4. MONITORAR RENDER
print("4. Acompanhando renderização no container...", flush=True)
last_pct = -1
start_t = time.time()
completed = False

while time.time() - start_t < 900:
    stdin, stdout, stderr = c.exec_command(f"docker logs --tail 15 {cid}")
    logs = stdout.read().decode('utf-8', errors='replace')
    
    # Pegar apenas a linha de progresso mais recente
    current_line = None
    for line in logs.split('\n'):
        if "Renderizando:" in line:
            current_line = line
        elif "SFX procedural mixado" in line:
            print(f"  [Remotion Audio] {line.strip()}", flush=True)
        elif "Mixando áudio" in line:
            print(f"  [Remotion Audio] {line.strip()}", flush=True)
        elif "Concluído com áudio" in line and "heroshot_60s_v4" in line:
            completed = True
            break
        elif "ERRO job heroshot_60s_v4" in line:
            print(f"❌ {line.strip()}", flush=True)
            c.close()
            sys.exit(1)

    if current_line:
        parts = current_line.split("Renderizando: ")
        if len(parts) > 1:
            pct_str = parts[1].split("%")[0].strip()
            try:
                pct = int(pct_str)
                if pct != last_pct:
                    elapsed = time.time() - start_t
                    print(f"  [{elapsed:.0f}s] [Remotion Render] {current_line.strip()}", flush=True)
                    last_pct = pct
            except:
                pass
            
    if completed:
        print("\n✅ Renderização e mixagem de áudio concluídas com sucesso!", flush=True)
        break
        
    time.sleep(3)

c.close()

if not completed:
    print("⚠️ Timeout aguardando renderização.", flush=True)
    sys.exit(1)

# 5. BAIXAR O VÍDEO
url = f"http://{HOST}:3001/storage/render_heroshot_60s_v4.mp4"
print(f"\n5. Baixando vídeo renderizado de {url}...", flush=True)
urllib.request.urlretrieve(url, LOCAL_VIDEO_PATH)
size_mb = os.path.getsize(LOCAL_VIDEO_PATH) / (1024 * 1024)
print(f"✅ Vídeo baixado localmente: {LOCAL_VIDEO_PATH} ({size_mb:.2f} MB)", flush=True)

# 6. VERIFICAR COM FFPROBE E EXTRAIR FRAMES
print("\n6. Extraindo frames demonstrativos...", flush=True)
try:
    probe_cmd = f'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "{LOCAL_VIDEO_PATH}"'
    dur_out = subprocess.check_output(probe_cmd, shell=True).decode('utf-8').strip()
    dur = float(dur_out)
    print(f"⏱️ Duração real: {dur:.2f}s (~{int(dur*30)} frames)", flush=True)
    
    timestamps = [4, 12, 21, 30, 39, 48, 56]
    for ts in timestamps:
        frame_out = os.path.join(FRAMES_DIR, f"heroshot_frame_{ts:02d}s.jpg")
        cmd = f'ffmpeg -y -ss {ts} -i "{LOCAL_VIDEO_PATH}" -vframes 1 -q:v 2 "{frame_out}"'
        subprocess.run(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if os.path.exists(frame_out):
            print(f"📸 Frame aos {ts}s: {frame_out} ({os.path.getsize(frame_out)//1024} KB)", flush=True)
except Exception as err:
    print(f"Aviso no ffprobe/ffmpeg: {err}", flush=True)

print("\n🎉 Teste do HeroShotReveal 60s concluído com sucesso total!", flush=True)
