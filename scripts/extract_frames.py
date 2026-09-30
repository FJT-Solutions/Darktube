import paramiko
import os
import sys

HOST = "31.220.92.254"
USER = "root"
PASS = "fjt@Solutions1"

OUT_DIR = r"c:\Users\natha\Documents\project\darktube\out\test_renders\surveillancecam_frames"
os.makedirs(OUT_DIR, exist_ok=True)

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=22, username=USER, password=PASS, timeout=15)

_, o, _ = c.exec_command("docker ps -q -f name=n8n-remotionservice | head -n1")
cid = o.read().decode().strip()
print(f"Container: {cid}")

timestamps = [3.0, 13.0, 23.0, 33.0, 43.0, 53.0]
for i, ts in enumerate(timestamps):
    cmd = f"""
docker exec {cid} ffmpeg -y -ss {ts} -i /app/output/render_surveillancecam_60s_v1.mp4 -vframes 1 -q:v 2 /app/output/frame_{i+1}.jpg
docker cp {cid}:/app/output/frame_{i+1}.jpg /tmp/surveillance_frame_{i+1}.jpg
"""
    stdin, stdout, stderr = c.exec_command(cmd)
    stdout.channel.recv_exit_status()
    print(f"Frame {i+1} at {ts}s extraído no host.")

sftp = c.open_sftp()
for i, ts in enumerate(timestamps):
    local_path = os.path.join(OUT_DIR, f"scene_{i+1}_{int(ts)}s.jpg")
    sftp.get(f"/tmp/surveillance_frame_{i+1}.jpg", local_path)
    print(f"Frame {i+1} baixado: {local_path} ({os.path.getsize(local_path)} bytes)")

sftp.close()
c.close()
print("Todos os frames do SurveillanceCam baixados com sucesso!")
