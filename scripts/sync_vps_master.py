import paramiko
import sys
import io
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

HOST = "31.220.92.254"
USER = "root"
PASS = "fjt@Solutions1"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, port=22, username=USER, password=PASS, timeout=15)

script = """
set -e
echo "=== Updating /etc/dokploy/applications/n8n-remotionservice-ry6eh9/code ==="
cd /etc/dokploy/applications/n8n-remotionservice-ry6eh9/code
git reset --hard
git clean -fd
git fetch origin master
git checkout master
git pull origin master
git log -1 --oneline

CID=$(docker ps -q -f name=n8n-remotionservice | head -n1)
echo "Active Remotion Container ID: $CID"

echo "=== Syncing remotion files from host repo to running container ==="
docker cp /etc/dokploy/applications/n8n-remotionservice-ry6eh9/code/remotion/. $CID:/app/remotion/
docker cp /etc/dokploy/applications/n8n-remotionservice-ry6eh9/code/scripts/remotion-server/server.js $CID:/app/scripts/remotion-server/server.js || true
docker cp /etc/dokploy/applications/n8n-remotionservice-ry6eh9/code/scripts/remotion-server/server.js $CID:/app/server.js || true

echo "=== Restarting container to apply updated server.js and pre-bundle ==="
docker restart $CID
"""

stdin, stdout, stderr = c.exec_command(script, timeout=120)
print(stdout.read().decode('utf-8', errors='replace'))
print("ERR:", stderr.read().decode('utf-8', errors='replace'))

print("Aguardando bundle pré-compilar no container (45s)...", flush=True)
time.sleep(30)

for attempt in range(15):
    time.sleep(4)
    stdin, stdout, stderr = c.exec_command("docker exec $(docker ps -q -f name=n8n-remotionservice | head -n1) curl -s http://127.0.0.1:3001/health")
    health = stdout.read().decode('utf-8').strip()
    print(f"  Attempt {attempt+1}: {health}", flush=True)
    if '"bundled":true' in health:
        print("\n✅ Remotion Service pronto e bundle compilado!", flush=True)
        break

c.close()
