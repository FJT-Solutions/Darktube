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
FRAMES_DIR = os.path.join(OUT_DIR, "tactiledossier_frames")
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(FRAMES_DIR, exist_ok=True)

LOCAL_VIDEO_PATH = os.path.join(OUT_DIR, "TactileDocumentaryDossier_60s.mp4")

# 6 CENAS DOCUMENTÁRIO TÁTIL CALIBRADAS PARA 60 SEGUNDOS (1440 FRAMES @ 24FPS)
script_scenes = [
    {
        "id": "dossier_00",
        "title": "PONTO CEGO GLOBAL",
        "badge": "99% DA INTERNET",
        "text": "Quase toda a internet da Terra não passa pelo céu, mas por finos cabos de vidro estendidos no assoalho escuro do oceano.",
        "image": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1080&q=80",
        "dur": 10.0,
    },
    {
        "id": "dossier_01",
        "title": "ROTA CRÍTICA",
        "badge": "ESTREITO DE MALACA",
        "text": "No Canal de Suez e no Estreito de Malaca, dezesseis cabos concentram setenta por cento de todo o tráfego entre a Europa e a Ásia.",
        "image": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&q=80",
        "dur": 10.0,
    },
    {
        "id": "dossier_02",
        "title": "SABOTAGEM HÍBRIDA",
        "badge": "MAR BÁLTICO",
        "text": "Em dois mil e vinte e três, âncoras de cargueiros fantasmas romperam três conexões cruciais no Mar Báltico em uma única noite.",
        "image": "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1080&q=80",
        "dur": 10.0,
    },
    {
        "id": "dossier_03",
        "title": "MONOPÓLIO PRIVADO",
        "badge": "GOOGLE E META",
        "text": "As grandes empresas de tecnologia já financiam e controlam diretamente mais de cinquenta por cento da infraestrutura subaquática do planeta.",
        "image": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1080&q=80",
        "dur": 10.0,
    },
    {
        "id": "dossier_04",
        "title": "GUERRA SUBMARINA",
        "badge": "PROFUNDIDADE 3000M",
        "text": "Submarinos espiões equipados com braços robóticos e sondas de mergulho operam a três mil metros de profundidade em missões secretas.",
        "image": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1080&q=80",
        "dur": 10.0,
    },
    {
        "id": "dossier_05",
        "title": "COLAPSO ESTRATÉGICO",
        "badge": "APAGÃO TOTAL",
        "text": "Se apenas cinco nós estratégicos forem cortados simultaneamente, o sistema financeiro internacional e bancos mundiais colapsam em minutos.",
        "image": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080&q=80",
        "dur": 10.0,
    }
]

print("=== PRODUÇÃO TACTILE DOCUMENTARY DOSSIER (60s @ 720p 24fps) ===", flush=True)

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
        "captionText": sc["text"],
        "audioUrl": f"/app/output/{sc['id']}.mp3",
        "imageUrl": sc["image"],
        "durationSeconds": sc["dur"],
        "transitionIn": "none",
        "transitionDurationFrames": 0,
        "letteringLines": [
            {"text": sc["title"], "isHighlight": True, "highlightColor": "#FFE600"},
            {"text": sc["badge"], "isHighlight": False}
        ],
        "badgeText": sc["badge"],
        "words": make_word_timings(sc["text"], sc["audio_dur"]),
    })

total_dur = sum(s["durationSeconds"] for s in remotion_scenes)
fps = 24
total_frames = int(round(total_dur * fps))
print(f"\nDuração total calculada: {total_dur:.1f}s ({total_frames} frames @ {fps}fps, 720x1280)", flush=True)

# 4. ENVIAR PAYLOAD DE RENDER
job_id = "tactiledossier_60s_v1"
render_payload = {
    "historyId": job_id,
    "callbackUrl": "http://127.0.0.1:3001/render-callback",
    "composition": {
        "templateId": "TactileDocumentaryDossier",
        "format": "vertical",
        "width": 720,
        "height": 1280,
        "fps": 24,
        "jpegQuality": 75,
        "concurrency": 2,
        "primaryColor": "#00F0FF",
        "accentColor": "#FFE600",
        "showWatermark": True,
        "watermarkText": "DARKTUBE // DOSSIÊ",
        "backgroundMusicUrl": "/app/output/bgm_cyber.mp3",
        "scenes": remotion_scenes,
    }
}

print("\n4. Submetendo job de renderização ao Remotion Service...", flush=True)
payload_json = json.dumps(render_payload, ensure_ascii=False)

submit_cmd = f"""
cat << 'EOF' > /tmp/tactile_payload.json
{payload_json}
EOF
docker cp /tmp/tactile_payload.json {cid}:/tmp/tactile_payload.json
docker exec {cid} curl -s -X POST http://127.0.0.1:3001/render \\
  -H "Content-Type: application/json" \\
  -d @/tmp/tactile_payload.json
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
        if "Renderizando:" in line:
            current_line = line
        elif "SFX procedural mixado" in line:
            print(f"  [Remotion Audio] {line.strip()}", flush=True)
        elif "Mixando áudio" in line:
            print(f"  [Remotion Audio] {line.strip()}", flush=True)
        elif "Concluído com áudio" in line and job_id in line:
            completed = True
            break
        elif f"ERRO job {job_id}" in line:
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

if not completed:
    print("⚠️ Timeout aguardando renderização.", flush=True)
    c.close()
    sys.exit(1)

# 6. BAIXAR O VÍDEO VIA SFTP
print("\n6. Localizando e baixando vídeo via SFTP...", flush=True)
stdin, stdout, stderr = c.exec_command(f'docker exec {cid} find /app /tmp -name "*{job_id}*.mp4" 2>/dev/null')
found_paths = [p.strip() for p in stdout.read().decode('utf-8').split('\n') if p.strip()]
print(f"Caminhos no container: {found_paths}", flush=True)

container_file = found_paths[0] if found_paths else f"/app/output/render_{job_id}.mp4"
host_tmp = f"/tmp/render_{job_id}.mp4"
stdin, stdout, stderr = c.exec_command(f"docker cp {cid}:{container_file} {host_tmp}")
stdout.channel.recv_exit_status()

sftp = c.open_sftp()
sftp.get(host_tmp, LOCAL_VIDEO_PATH)
sftp.close()

size_mb = os.path.getsize(LOCAL_VIDEO_PATH) / (1024 * 1024)
print(f"✅ Vídeo baixado localmente: {LOCAL_VIDEO_PATH} ({size_mb:.2f} MB)", flush=True)

# 7. EXTRAIR FRAMES
print("\n7. Extraindo frames demonstrativos...", flush=True)
timestamps = [4, 14, 24, 34, 44, 54]
for ts in timestamps:
    cmd = f'docker exec {cid} ffmpeg -y -ss {ts} -i {container_file} -vframes 1 -q:v 2 /tmp/tactile_{ts:02d}s.jpg'
    stdin, stdout, stderr = c.exec_command(cmd)
    stdout.channel.recv_exit_status()
    c.exec_command(f'docker cp {cid}:/tmp/tactile_{ts:02d}s.jpg /tmp/tactile_{ts:02d}s.jpg')

sftp = c.open_sftp()
for ts in timestamps:
    vps_jpg = f'/tmp/tactile_{ts:02d}s.jpg'
    local_jpg = os.path.join(FRAMES_DIR, f"tactiledossier_frame_{ts:02d}s.jpg")
    try:
        sftp.get(vps_jpg, local_jpg)
        print(f"📸 Frame aos {ts}s: {local_jpg} ({os.path.getsize(local_jpg)//1024} KB)", flush=True)
    except Exception as e:
        print(f"Aviso no frame {ts}s: {e}", flush=True)

sftp.close()
c.close()
print("\n🎉 TactileDocumentaryDossier 60s 720p finalizado com sucesso!", flush=True)
