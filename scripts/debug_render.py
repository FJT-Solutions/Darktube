import paramiko
import sys
import io
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('31.220.92.254', username='root', password='fjt@Solutions1')

stdin, stdout, stderr = c.exec_command("docker ps -q -f name=n8n-remotionservice | head -n1")
cid = stdout.read().decode('utf-8').strip()
print(f"Container: {cid}")

stdin, stdout, stderr = c.exec_command(f"docker logs --tail 25 {cid}")
logs = stdout.read().decode('utf-8', errors='replace')
for line in logs.split('\n'):
    if any(k in line for k in ['Render progresso', 'Renderizando', 'Mixando', 'Remotion', 'Error', 'error']):
        print("LOG:", line.strip())

# Check if output exists
stdin, stdout, stderr = c.exec_command(f"docker exec {cid} ls -lh /app/output/render_vhsnoir_60s_v1.mp4 2>/dev/null")
print("FILE:", stdout.read().decode('utf-8').strip())

c.close()
