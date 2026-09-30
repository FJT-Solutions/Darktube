import paramiko
import json
import time
import os
import sys
import io
import subprocess

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

HOST = "31.220.92.254"
USER = "root"
PASS = "fjt@Solutions1"

OUT_DIR = r"c:\Users\natha\Documents\project\darktube\out\test_renders"
FRAMES_DIR = os.path.join(OUT_DIR, "vhsnoir_frames")
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(FRAMES_DIR, exist_ok=True)

LOCAL_VIDEO_PATH = os.path.join(OUT_DIR, "VHSNoir_60s.mp4")

# 6 CENAS VHS NOIR CALIBRADAS PARA 60 SEGUNDOS (1440 FRAMES @ 24FPS)
script_scenes = [
    {
        "id": "vhs_01",
        "title": "ARQUIVO ANALÓGICO 1997",
        "timestamp": "JAN.15.1997  03:14",
        "text": "Uma fita de vídeo não identificada foi encontrada nos escombros de uma antiga estação de rádio pirata abandonada em noventa e sete.",
        "image": "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1080&q=80",
        "dur": 10.0,
    },
    {
        "id": "vhs_02",
        "title": "SINAL CORROMPIDO",
        "timestamp": "JAN.15.1997  03:18",
        "text": "Entre ruídos brancos e chiados magnéticos, a gravação exibe mensagens codificadas em frequências sonoras inaudíveis ao ouvido humano.",
        "image": "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1080&q=80",
        "dur": 10.0,
    },
    {
        "id": "vhs_03",
        "title": "TRANSMISSÃO PIRATA",
        "timestamp": "JAN.15.1997  03:22",
        "text": "Testemunhas afirmam que na noite da transmissão, todos os televisores de cinco cidades vizinhas sincronizaram no mesmo canal misterioso.",
        "image": "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1080&q=80",
        "dur": 10.0,
    },
    {
        "id": "vhs_04",
        "title": "RELATÓRIO CONFIDENCIAL",
        "timestamp": "JAN.15.1997  03:26",
        "text": "Inspetores federais tentaram rastrear a origem da onda eletromagnética, mas a fonte parecia se mover através da própria rede elétrica.",
        "image": "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1080&q=80",
        "dur": 10.0,
    },
    {
        "id": "vhs_05",
        "title": "EFEITO RESIDUAL",
        "timestamp": "JAN.15.1997  03:30",
        "text": "Quem assistiu à fita original relatou alucinações auditivas e insônia severa, repetindo sequências numéricas de sete dígitos por dias.",
        "image": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1080&q=80",
        "dur": 10.0,
    },
    {
        "id": "vhs_06",
        "title": "FITA DESTRUÍDA",
        "timestamp": "JAN.15.1997  03:34",
        "text": "A cópia mestre desintegrou-se por oxidação química trinta minutos após a perícia. Este é o único trecho digitalizado sobrevivente.",
        "image": "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1080&q=80",
        "dur": 10.0,
    }
]

print("=== PRODUÇÃO VHS NOIR (60s @ 720p 24fps) ===", flush=True)

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=22, username=USER, password=PASS, timeout=15)

stdin, stdout, stderr = c.exec_command("docker ps -q -f name=n8n-remotionservice | head -n1")
cid = stdout.read().decode('utf-8').strip()
print(f"Container Remotion ativo: {cid}", flush=True)

# 1. VERIFICAR SE O BUNDLE ESTÁ PRONTO
print("\n1. Verificando bundle Remotion...", flush=True)
for _ in range(12):
    stdin, stdout, stderr = c.exec_command(f"docker exec {cid} curl -s http://127.0.0.1:3001/health")
    res = stdout.read().decode('utf-8').strip()
    if '"bundled":true' in res:
        print("✅ Bundle pronto no container!", flush=True)
        break
    time.sleep(4)

# 2. SINTETIZAR NARRAÇÃO PIPER TTS (PORTUGUÊS)
print("\n2. Sintetizando narração Piper TTS (voz: faber)...", flush=True)
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
        dur = 7.5
    item["audio_dur"] = dur
    item["dur"] = max(item["dur"], round(dur + 1.2, 1))
    print(f"  [{sid}] Áudio: {dur:.2f}s | Duração cena: {item['dur']}s", flush=True)

# 3. GERAR TIMINGS DE KARAOKE FONÉTICO
def make_word_timings(text, audio_dur):
    words = text.strip().split()
    if not words:
        return []
    clean_words = [w.replace(',', '').replace('.', '').replace('!', '').replace('?', '').replace(':', '') for w in words]
    weights = [max(2, len(cw)) for cw in clean_words]
    total_weight = sum(weights)
    speech_start = 0.2
    usable_dur = max(0.5, audio_dur - 0.3)
    current_time = speech_start
    timings = []
    for w, weight in zip(words, weights):
        w_dur = (weight / total_weight) * usable_dur
        timings.append({
            "word": w,
            "startInSeconds": round(current_time, 3),
            "endInSeconds": round(current_time + w_dur, 3),
        })
        current_time += w_dur
    return timings

remotion_scenes = []
for idx, sc in enumerate(script_scenes):
    remotion_scenes.append({
        "index": idx,
        "headline": sc["title"],
        "captionText": sc["text"],
        "audioUrl": f"/app/output/{sc['id']}.mp3",
        "imageUrl": sc["image"],
        "durationSeconds": sc["dur"],
        "transitionIn": "none",
        "transitionDurationFrames": 0,
        "timestamp": sc["timestamp"],
        "words": make_word_timings(sc["text"], sc["audio_dur"]),
    })

total_dur = sum(s["durationSeconds"] for s in remotion_scenes)
fps = 24
total_frames = int(round(total_dur * fps))
print(f"\nDuração total calculada: {total_dur:.1f}s ({total_frames} frames @ {fps}fps, 720x1280)", flush=True)

# 4. ENVIAR PAYLOAD DE RENDER
job_id = "vhsnoir_60s_v1"
render_payload = {
    "historyId": job_id,
    "callbackUrl": "http://127.0.0.1:3001/render-callback",
    "composition": {
        "templateId": "VHSNoir",
        "format": "vertical",
        "width": 720,
        "height": 1280,
        "fps": 24,
        "jpegQuality": 75,
        "concurrency": 2,
        "primaryColor": "#FF0040",
        "accentColor": "#FFFFFF",
        "showWatermark": True,
        "watermarkText": "DARKTUBE // VHS",
        "backgroundMusicUrl": "/app/output/bgm_cyber.mp3",
        "scenes": remotion_scenes,
    }
}

print("\n4. Submetendo job de renderização ao Remotion Service...", flush=True)
payload_json = json.dumps(render_payload, ensure_ascii=False)

submit_cmd = f"""
cat << 'EOF' > /tmp/vhs_payload.json
{payload_json}
EOF
docker cp /tmp/vhs_payload.json {cid}:/tmp/vhs_payload.json
docker exec {cid} curl -s -X POST http://127.0.0.1:3001/render \\
  -H "Content-Type: application/json" \\
  -d @/tmp/vhs_payload.json
"""
stdin, stdout, stderr = c.exec_command(submit_cmd, timeout=30)
submit_res = stdout.read().decode('utf-8', errors='replace').strip()
print(f"Resposta do /render: {submit_res}", flush=True)

# 5. MONITORAR PROGRESSO
print("\n5. Monitorando renderização (720p @ 24fps)...", flush=True)
last_pct = -1
start_t = time.time()
completed = False

while time.time() - start_t < 900:  # máx 15 min
    stdin, stdout, stderr = c.exec_command(f"docker logs --tail 12 {cid}")
    logs = stdout.read().decode('utf-8', errors='replace')
    
    current_line = None
    for line in logs.split('\n'):
        if 'Render progresso:' in line or 'Renderizando' in line or 'Mixando áudio' in line or 'Áudio mixado' in line:
            current_line = line.strip()
        if 'Progresso:' in line:
            current_line = line.strip()
    
    if current_line:
        print(f"  [{int(time.time() - start_t)}s] {current_line}", flush=True)
    
    # Verificar se o arquivo final foi gerado
    stdin, stdout, stderr = c.exec_command(f"docker exec {cid} ls -lh /app/output/render_{job_id}.mp4 2>/dev/null")
    ls_out = stdout.read().decode('utf-8').strip()
    if 'render_' in ls_out and not 'staging' in ls_out:
        print(f"\n🎉 Vídeo renderizado com sucesso no container: {ls_out}", flush=True)
        completed = True
        break
        
    time.sleep(6)

if not completed:
    print("❌ Renderização não finalizou dentro do tempo limite.", flush=True)
    c.close()
    sys.exit(1)

# 6. BAIXAR O VÍDEO LOCALMENTE
print("\n6. Baixando vídeo para o ambiente local...", flush=True)
c.exec_command(f"docker cp {cid}:/app/output/render_{job_id}.mp4 /tmp/render_{job_id}.mp4")
time.sleep(2)

sftp = c.open_sftp()
sftp.get(f"/tmp/render_{job_id}.mp4", LOCAL_VIDEO_PATH)
sftp.close()

file_size_mb = os.path.getsize(LOCAL_VIDEO_PATH) / (1024 * 1024)
print(f"✅ Vídeo salvo localmente: {LOCAL_VIDEO_PATH} ({file_size_mb:.2f} MB)", flush=True)

# 7. EXTRAIR KEYFRAMES PARA INSPEÇÃO VISUAL
print("\n7. Extraindo frames representativos...", flush=True)
timestamps = [2.0, 12.0, 22.0, 32.0, 42.0, 52.0]
for idx, ts in enumerate(timestamps):
    frame_path = os.path.join(FRAMES_DIR, f"frame_scene_{idx + 1}_{int(ts)}s.jpg")
    cmd = [
        "ffmpeg", "-y", "-ss", str(ts), "-i", LOCAL_VIDEO_PATH,
        "-vframes", "1", "-q:v", "2", frame_path
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        print(f"  📸 Keyframe {idx + 1} extraído ({ts}s): {frame_path}", flush=True)
    except Exception as e:
        print(f"  ⚠️ Falha ao extrair frame {idx + 1}: {e}", flush=True)

c.close()
print("\n=== VALIDAÇÃO DO TEMPLATE VHS NOIR CONCLUÍDA COM SUCESSO! ===", flush=True)
