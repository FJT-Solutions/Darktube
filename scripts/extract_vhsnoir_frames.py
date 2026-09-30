import paramiko
import os
import sys
import io
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

HOST = "31.220.92.254"
USER = "root"
PASS = "fjt@Solutions1"

OUT_DIR = r"c:\Users\natha\Documents\project\darktube\out\test_renders"
FRAMES_DIR = os.path.join(OUT_DIR, "vhsnoir_frames")
os.makedirs(FRAMES_DIR, exist_ok=True)

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=22, username=USER, password=PASS, timeout=15)

stdin, stdout, stderr = c.exec_command("docker ps -q -f name=n8n-remotionservice | head -n1")
cid = stdout.read().decode('utf-8').strip()
print(f"Container: {cid}")

# Garante que o vídeo está dentro do container
cmd_setup = f"docker cp /tmp/render_vhsnoir_60s_v1.mp4 {cid}:/tmp/vhs_video.mp4"
stdin, stdout, stderr = c.exec_command(cmd_setup)
stdout.channel.recv_exit_status()

timestamps = [2.0, 12.0, 22.0, 32.0, 42.0, 52.0]
sftp = c.open_sftp()

for idx, ts in enumerate(timestamps):
    frame_path = os.path.join(FRAMES_DIR, f"frame_scene_{idx + 1}_{int(ts)}s.jpg")
    cmd = f"docker exec {cid} ffmpeg -y -ss {ts} -i /tmp/vhs_video.mp4 -vframes 1 -q:v 2 /tmp/vhs_frame_{idx+1}.jpg && docker cp {cid}:/tmp/vhs_frame_{idx+1}.jpg /tmp/vhs_frame_{idx+1}.jpg"
    stdin, stdout, stderr = c.exec_command(cmd)
    stdout.channel.recv_exit_status()
    sftp.get(f"/tmp/vhs_frame_{idx+1}.jpg", frame_path)
    print(f"  📸 Keyframe {idx + 1} extraído ({ts}s): {frame_path}", flush=True)

sftp.close()
c.close()
print("✅ Todos os 6 frames do VHSNoir extraídos com sucesso!")
