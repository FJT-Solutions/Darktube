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
FRAMES_DIR = os.path.join(OUT_DIR, "quiztrivia_frames")
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(FRAMES_DIR, exist_ok=True)

LOCAL_VIDEO_PATH = os.path.join(OUT_DIR, "QuizTrivia_60s.mp4")

# 5 PERGUNTAS DE QUIZ CIENTÍFICO OBSCURO (~60s @ 24fps)
quiz_scenes = [
    {
        "id": "quiz_01",
        "question": "QUAL O LUGAR MAIS SILENCIOSO DA TERRA?",
        "options": ["Fossa das Marianas", "Câmara Anecoica", "Cúpula Ártica", "Caverna Son Doong"],
        "correctIndex": 1,
        "badge": "ACÚSTICA",
        "text": "A câmara anecoica nos Estados Unidos absorve tanto som que você consegue ouvir seu próprio sangue circular.",
        "image": "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1080&q=80",
        "dur": 11.0,
    },
    {
        "id": "quiz_02",
        "question": "QUANTO TEMPO A LUZ DO SOL LEVA ATÉ NÓS?",
        "options": ["Cinco Minutos", "Oito Minutos e Vinte", "Quinze Minutos", "Instantâneo"],
        "correctIndex": 1,
        "badge": "ASTRONOMIA",
        "text": "Os fótons emitidos pela superfície solar viajam a trezentos mil quilômetros por segundo por oito minutos e vinte segundos.",
        "image": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&q=80",
        "dur": 11.0,
    },
    {
        "id": "quiz_03",
        "question": "QUAL O ELEMENTO MAIS LETAL POR GRAMA?",
        "options": ["Cianeto", "Polônio 210", "Chumbo Puro", "Mercúrio"],
        "correctIndex": 1,
        "badge": "QUÍMICA",
        "text": "Um único grama de polônio duzentos e dez é capaz de vaporizar e aniquilar cinquenta milhões de pessoas.",
        "image": "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1080&q=80",
        "dur": 11.0,
    },
    {
        "id": "quiz_04",
        "question": "O QUE OCORRE NO HORIZONTE DE EVENTOS?",
        "options": ["Fusão Termonuclear", "Espaguetificação", "Reflexão Espelho", "Onda Térmica"],
        "correctIndex": 1,
        "badge": "RELATIVIDADE",
        "text": "A gravidade diferencial puxa os pés com tanta intensidade que o corpo é esticado como um fio fino.",
        "image": "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1080&q=80",
        "dur": 11.0,
    },
    {
        "id": "quiz_05",
        "question": "QUAL SER VIVO SUPORTA O VÁCUO ESPACIAL?",
        "options": ["Escorpião", "Tardígrado", "Barata d'água", "Formiga Bala"],
        "correctIndex": 1,
        "badge": "BIOLOGIA",
        "text": "O tardígrado entra em dessecação quase total, suportando radiação cósmica letal e zero absoluto.",
        "image": "https://images.unsplash.com/photo-1544717305-2782549b5136?w=1080&q=80",
        "dur": 11.0,
    }
]

print("=== PRODUÇÃO QUIZ TRIVIA (60s @ 720p 24fps) ===", flush=True)

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=22, username=USER, password=PASS, timeout=15)

stdin, stdout, stderr = c.exec_command("docker ps -q -f name=n8n-remotionservice | head -n1")
cid = stdout.read().decode('utf-8').strip()
print(f"Container Remotion ativo: {cid}", flush=True)

# 1. SINTETIZAR NARRAÇÃO PIPER TTS
print("\n1. Sintetizando narração Piper TTS (voz: faber)...", flush=True)
for item in quiz_scenes:
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
for idx, sc in enumerate(quiz_scenes):
    remotion_scenes.append({
        "index": idx,
        "headline": sc["question"],
        "badgeText": sc["badge"],
        "captionText": sc["text"],
        "options": sc["options"],
        "correctIndex": sc["correctIndex"],
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
job_id = "quiztrivia_60s_v1"
render_payload = {
    "historyId": job_id,
    "callbackUrl": "http://127.0.0.1:3001/render-callback",
    "composition": {
        "templateId": "QuizTrivia",
        "format": "vertical",
        "width": 720,
        "height": 1280,
        "fps": 24,
        "jpegQuality": 75,
        "concurrency": 2,
        "primaryColor": "#00F0FF",
        "accentColor": "#00FF66",
        "backgroundMusicUrl": "/app/output/bgm_cyber.mp3",
        "scenes": remotion_scenes,
    }
}

print("\n3. Submetendo job de renderização ao Remotion Service...", flush=True)
payload_json = json.dumps(render_payload, ensure_ascii=False)

submit_cmd = f"""
cat << 'EOF' > /tmp/quiz_payload.json
{payload_json}
EOF
docker cp /tmp/quiz_payload.json {cid}:/tmp/quiz_payload.json
docker exec {cid} curl -s -X POST http://127.0.0.1:3001/render \\
  -H "Content-Type: application/json" \\
  -d @/tmp/quiz_payload.json
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
timestamps = [4.0, 15.0, 26.0, 37.0, 48.0]
sftp = c.open_sftp()
for idx, ts in enumerate(timestamps):
    frame_path = os.path.join(FRAMES_DIR, f"scene_{idx + 1}_{int(ts)}s.jpg")
    cmd = f"docker exec {cid} ffmpeg -y -ss {ts} -i /app/output/render_{job_id}.mp4 -vframes 1 -q:v 2 /app/output/quiz_frame_{idx+1}.jpg && docker cp {cid}:/app/output/quiz_frame_{idx+1}.jpg /tmp/quiz_frame_{idx+1}.jpg"
    stdin, stdout, stderr = c.exec_command(cmd)
    stdout.channel.recv_exit_status()
    sftp.get(f"/tmp/quiz_frame_{idx+1}.jpg", frame_path)
    print(f"  📸 Keyframe {idx + 1} extraído ({ts}s): {frame_path}", flush=True)

sftp.close()
c.close()
print("\n=== VALIDAÇÃO DO TEMPLATE QUIZ TRIVIA CONCLUÍDA COM SUCESSO! ===", flush=True)
