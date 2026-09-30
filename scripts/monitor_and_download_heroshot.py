import paramiko
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

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=22, username=USER, password=PASS, timeout=15)

stdin, stdout, stderr = c.exec_command("docker ps -q -f name=n8n-remotionservice | head -n1")
cid = stdout.read().decode('utf-8').strip()
print(f"Monitorando container ativo: {cid}", flush=True)

last_pct = -1
start_t = time.time()
completed = False

# Monitorar até 30 minutos adicionais
while time.time() - start_t < 1800:
    stdin, stdout, stderr = c.exec_command(f"docker logs --tail 15 {cid}")
    logs = stdout.read().decode('utf-8', errors='replace')
    
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
        
    time.sleep(4)

c.close()

if not completed:
    print("⚠️ Timeout aguardando renderização.", flush=True)
    sys.exit(1)

# BAIXAR O VÍDEO VIA SFTP
print("\nLocalizando e baixando vídeo renderizado via SFTP...", flush=True)
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=22, username=USER, password=PASS, timeout=15)

stdin, stdout, stderr = c.exec_command(f'docker exec {cid} find /app /tmp -name "*heroshot_60s_v4*.mp4" 2>/dev/null')
found_paths = [p.strip() for p in stdout.read().decode('utf-8').split('\n') if p.strip()]
print(f"Caminhos no container: {found_paths}", flush=True)

container_file = found_paths[0] if found_paths else f"/app/scripts/remotion-server/output/render_heroshot_60s_v4.mp4"
print(f"Arquivo alvo no container: {container_file}", flush=True)

host_tmp = "/tmp/render_heroshot_60s_v4.mp4"
stdin, stdout, stderr = c.exec_command(f"docker cp {cid}:{container_file} {host_tmp}")
code = stdout.channel.recv_exit_status()
print(f"Docker cp exit status: {code}", flush=True)

sftp = c.open_sftp()
sftp.get(host_tmp, LOCAL_VIDEO_PATH)
sftp.close()
c.close()

size_mb = os.path.getsize(LOCAL_VIDEO_PATH) / (1024 * 1024)
print(f"✅ Vídeo baixado localmente: {LOCAL_VIDEO_PATH} ({size_mb:.2f} MB)", flush=True)

# EXTRAIR FRAMES
print("\nExtraindo frames demonstrativos...", flush=True)
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

print("\n🎉 HeroShotReveal 60s 1080p finalizado com sucesso!", flush=True)
