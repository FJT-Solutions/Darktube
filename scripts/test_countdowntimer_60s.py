import paramiko
import json
import time
import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

HOST = "31.220.92.254"
USER = "root"
PASS = "fjt@Solutions1"

OUT_DIR = r"c:\Users\natha\Documents\project\darktube\out\test_renders"
FRAMES_DIR = os.path.join(OUT_DIR, "countdowntimer_frames")
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(FRAMES_DIR, exist_ok=True)

LOCAL_VIDEO_PATH = os.path.join(OUT_DIR, "CountdownTimer_60s.mp4")

# 6 CENAS TOP 5 CONTAGEM REGRESSIVA (60 SEGUNDOS @ 24FPS)
countdown_scenes = [
    {
        "id": "top_05",
        "title": "COFRE DO FIM DO MUNDO",
        "badge": "5º LUGAR",
        "text": "Localizado no Círculo Polar Ártico, o cofre de sementes foi construído para resistir a ataques nucleares e impactos de asteroides.",
        "image": "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?w=1080&q=80",
        "dur": 10.0,
    },
    {
        "id": "top_04",
        "title": "ILHA DAS COBRAS",
        "badge": "4º LUGAR",
        "text": "A marinha brasileira proíbe qualquer desembarque civil nesta ilha, infestada pela víbora dourada mais letal do planeta.",
        "image": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1080&q=80",
        "dur": 10.0,
    },
    {
        "id": "top_03",
        "title": "ARQUIVOS SECRETOS",
        "badge": "3º LUGAR",
        "text": "Com mais de oitenta quilômetros de prateleiras subterrâneas, o Vaticano guarda documentos milenares inacessíveis ao público.",
        "image": "https://images.unsplash.com/photo-1507842229452-7b3b4f65342a?w=1080&q=80",
        "dur": 10.0,
    },
    {
        "id": "top_02",
        "title": "ÁREA CINQUENTA E UM",
        "badge": "2º LUGAR",
        "text": "A base aérea de Nevada possui autorização expressa para uso de força letal contra qualquer um que ultrapasse seu perímetro.",
        "image": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1080&q=80",
        "dur": 10.0,
    },
    {
        "id": "top_01",
        "title": "SENTINELA DO NORTE",
        "badge": "1º LUGAR",
        "text": "Uma tribo isolada há mais de cinquenta mil anos rechaça qualquer contato moderno com flechas, protegida sob isolamento absoluto.",
        "image": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1080&q=80",
        "dur": 10.0,
    },
    {
        "id": "top_00",
        "title": "O GRANDE MISTÉRIO",
        "badge": "CLÍMAX",
        "text": "Fronteiras inacessíveis onde segredos continuam guardados a sete chaves. Qual desses lugares você teria coragem de explorar?",
        "image": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&q=80",
        "dur": 10.0,
    }
]

print("=== PRODUÇÃO COUNTDOWN TIMER (60s @ 720p 24fps) ===", flush=True)

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=22, username=USER, password=PASS, timeout=15)

stdin, stdout, stderr = c.exec_command("docker ps -q -f name=n8n-remotionservice | head -n1")
cid = stdout.read().decode('utf-8').strip()
print(f"Container Remotion ativo: {cid}", flush=True)

# 1. SINTETIZAR NARRAÇÃO PIPER TTS
print("\n1. Sintetizando narração Piper TTS (voz: faber)...", flush=True)
for item in countdown_scenes:
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

# 2. GERAR TIMINGS DE KARAOKE FONÉTICO
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
for idx, sc in enumerate(countdown_scenes):
    remotion_scenes.append({
        "index": idx,
        "headline": sc["title"],
        "badgeText": sc["badge"],
        "captionText": sc["text"],
        "audioUrl": f"/app/output/{sc['id']}.mp3",
        "imageUrl": sc["image"],
        "durationSeconds": sc["dur"],
        "words": make_word_timings(sc["text"], sc["audio_dur"]),
    })

total_dur = sum(s["durationSeconds"] for s in remotion_scenes)
fps = 24
total_frames = int(round(total_dur * fps))
print(f"\nDuração total calculada: {total_dur:.1f}s ({total_frames} frames @ {fps}fps, 720x1280)", flush=True)

# 3. ENVIAR PAYLOAD DE RENDER
job_id = "countdowntimer_60s_v1"
render_payload = {
    "historyId": job_id,
    "callbackUrl": "http://127.0.0.1:3001/render-callback",
    "composition": {
        "templateId": "CountdownTimer",
        "format": "vertical",
        "width": 720,
        "height": 1280,
        "fps": 24,
        "jpegQuality": 75,
        "concurrency": 2,
        "primaryColor": "#00F0FF",
        "urgencyColor": "#FF0040",
        "backgroundMusicUrl": "/app/output/bgm_cyber.mp3",
        "scenes": remotion_scenes,
    }
}

print("\n3. Submetendo job de renderização ao Remotion Service...", flush=True)
payload_json = json.dumps(render_payload, ensure_ascii=False)

submit_cmd = f"""
cat << 'EOF' > /tmp/countdown_payload.json
{payload_json}
EOF
docker cp /tmp/countdown_payload.json {cid}:/tmp/countdown_payload.json
docker exec {cid} curl -s -X POST http://127.0.0.1:3001/render \\
  -H "Content-Type: application/json" \\
  -d @/tmp/countdown_payload.json
"""
stdin, stdout, stderr = c.exec_command(submit_cmd, timeout=30)
submit_res = stdout.read().decode('utf-8', errors='replace').strip()
print(f"Resposta do /render: {submit_res}", flush=True)

# 4. MONITORAR PROGRESSO
print("\n4. Monitorando renderização (720p @ 24fps)...", flush=True)
start_t = time.time()
completed = False

while time.time() - start_t < 900:
    stdin, stdout, stderr = c.exec_command("docker ps -q -f name=n8n-remotionservice | head -n1")
    cid = stdout.read().decode('utf-8').strip()
    stdin, stdout, stderr = c.exec_command(f"docker logs --tail 12 {cid}")
    logs = stdout.read().decode('utf-8', errors='replace')
    
    current_line = None
    for line in logs.split('\n'):
        if any(k in line for k in ['Render progresso:', 'Renderizando:', 'Mixando áudio', 'Áudio mixado', 'Progresso:']):
            current_line = line.strip()
    
    if current_line:
        print(f"  [{int(time.time() - start_t)}s] {current_line}", flush=True)
    
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

# 5. BAIXAR O VÍDEO LOCALMENTE
print("\n5. Baixando vídeo para o ambiente local...", flush=True)
c.exec_command(f"docker cp {cid}:/app/output/render_{job_id}.mp4 /tmp/render_{job_id}.mp4")
time.sleep(2)

sftp = c.open_sftp()
sftp.get(f"/tmp/render_{job_id}.mp4", LOCAL_VIDEO_PATH)
sftp.close()

file_size_mb = os.path.getsize(LOCAL_VIDEO_PATH) / (1024 * 1024)
print(f"✅ Vídeo salvo localmente: {LOCAL_VIDEO_PATH} ({file_size_mb:.2f} MB)", flush=True)

# 6. EXTRAIR KEYFRAMES PARA INSPEÇÃO VISUAL
print("\n6. Extraindo frames representativos...", flush=True)
timestamps = [3.0, 13.0, 23.0, 33.0, 43.0, 53.0]
sftp = c.open_sftp()
for idx, ts in enumerate(timestamps):
    frame_path = os.path.join(FRAMES_DIR, f"scene_{idx + 1}_{int(ts)}s.jpg")
    cmd = f"""
docker exec {cid} ffmpeg -y -ss {ts} -i /app/output/render_{job_id}.mp4 -vframes 1 -q:v 2 /app/output/countdown_frame_{idx+1}.jpg
docker cp {cid}:/app/output/countdown_frame_{idx+1}.jpg /tmp/countdown_frame_{idx+1}.jpg
"""
    c.exec_command(cmd)
    time.sleep(1)
    sftp.get(f"/tmp/countdown_frame_{idx+1}.jpg", frame_path)
    print(f"  📸 Keyframe {idx + 1} extraído ({ts}s): {frame_path}", flush=True)

sftp.close()
c.close()
print("\n=== VALIDAÇÃO DO TEMPLATE COUNTDOWN TIMER CONCLUÍDA COM SUCESSO! ===", flush=True)
