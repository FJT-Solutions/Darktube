import paramiko
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
FRAMES_DIR = os.path.join(OUT_DIR, "vhsnoir_frames")
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(FRAMES_DIR, exist_ok=True)

LOCAL_VIDEO_PATH = os.path.join(OUT_DIR, "VHSNoir_60s.mp4")
job_id = "vhsnoir_60s_v1"

print("=== MONITORAMENTO DE RENDER: VHS NOIR (60s) ===", flush=True)

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=22, username=USER, password=PASS, timeout=15)

start_t = time.time()
completed = False

while time.time() - start_t < 900:
    stdin, stdout, stderr = c.exec_command("docker ps -q -f name=n8n-remotionservice | head -n1")
    cid = stdout.read().decode('utf-8').strip()
    
    stdin, stdout, stderr = c.exec_command(f"docker logs --tail 8 {cid}")
    logs = stdout.read().decode('utf-8', errors='replace')
    
    current_line = None
    for line in logs.split('\n'):
        if any(k in line for k in ['Render progresso', 'Renderizando', 'Mixando áudio', 'Áudio mixado', 'Progresso:']):
            current_line = line.strip()
    
    if current_line:
        elapsed = int(time.time() - start_t)
        print(f"  [{elapsed}s] {current_line}", flush=True)
    
    # Verificar se o arquivo final foi gerado
    stdin, stdout, stderr = c.exec_command(f"docker exec {cid} ls -lh /app/output/render_{job_id}.mp4 2>/dev/null")
    ls_out = stdout.read().decode('utf-8').strip()
    if 'render_' in ls_out and not 'staging' in ls_out:
        print(f"\n🎉 Vídeo renderizado com sucesso no container: {ls_out}", flush=True)
        completed = True
        break
        
    time.sleep(8)

if not completed:
    print("❌ Renderização não finalizou dentro do tempo limite.", flush=True)
    c.close()
    sys.exit(1)

# BAIXAR O VÍDEO LOCALMENTE
print("\nBaixando vídeo para o ambiente local...", flush=True)
c.exec_command(f"docker cp {cid}:/app/output/render_{job_id}.mp4 /tmp/render_{job_id}.mp4")
time.sleep(2)

sftp = c.open_sftp()
sftp.get(f"/tmp/render_{job_id}.mp4", LOCAL_VIDEO_PATH)
sftp.close()

file_size_mb = os.path.getsize(LOCAL_VIDEO_PATH) / (1024 * 1024)
print(f"✅ Vídeo salvo localmente: {LOCAL_VIDEO_PATH} ({file_size_mb:.2f} MB)", flush=True)

# EXTRAIR KEYFRAMES PARA INSPEÇÃO VISUAL
print("\nExtraindo frames representativos...", flush=True)
timestamps = [2.0, 12.0, 22.0, 32.0, 42.0, 52.0]
sftp = c.open_sftp()
for idx, ts in enumerate(timestamps):
    frame_path = os.path.join(FRAMES_DIR, f"frame_scene_{idx + 1}_{int(ts)}s.jpg")
    cmd = f"""
docker exec {cid} ffmpeg -y -ss {ts} -i /app/output/render_{job_id}.mp4 -vframes 1 -q:v 2 /app/output/vhs_frame_{idx+1}.jpg
docker cp {cid}:/app/output/vhs_frame_{idx+1}.jpg /tmp/vhs_frame_{idx+1}.jpg
"""
    c.exec_command(cmd)
    time.sleep(1)
    sftp.get(f"/tmp/vhs_frame_{idx+1}.jpg", frame_path)
    print(f"  📸 Keyframe {idx + 1} extraído ({ts}s): {frame_path}", flush=True)

sftp.close()
c.close()
print("\n=== VALIDAÇÃO DO TEMPLATE VHS NOIR CONCLUÍDA COM SUCESSO! ===", flush=True)
