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
echo "=== 1. Atualizando repositório Git no host VPS ==="
cd /etc/dokploy/applications/n8n-remotionservice-ry6eh9/code
git reset --hard
git clean -fd
git fetch origin master
git checkout master
git pull origin master
git log -1 --oneline

echo "=== 2. Copiando código para TODOS os containers Remotion em execução ==="
RUNNING_CIDS=$(docker ps --filter "name=n8n-remotionservice" --filter "status=running" -q)

for CID in $RUNNING_CIDS; do
  echo "Sincronizando container $CID..."
  docker cp /etc/dokploy/applications/n8n-remotionservice-ry6eh9/code/remotion/. $CID:/app/remotion/
  docker cp /etc/dokploy/applications/n8n-remotionservice-ry6eh9/code/scripts/remotion-server/server.js $CID:/app/server.js
  
  echo "Disparando /rebundle no container $CID..."
  docker exec $CID curl -s -X POST http://127.0.0.1:3001/rebundle
  echo ""
done
"""

stdin, stdout, stderr = c.exec_command(script, timeout=180)
print(stdout.read().decode('utf-8', errors='replace'))
print("ERR:", stderr.read().decode('utf-8', errors='replace'))

print("\nAguardando confirmação de saúde do bundle...", flush=True)
for attempt in range(15):
    time.sleep(3)
    stdin, stdout, stderr = c.exec_command("docker exec $(docker ps --filter 'name=n8n-remotionservice' --filter 'status=running' -q | head -n1) curl -s http://127.0.0.1:3001/health")
    health = stdout.read().decode('utf-8').strip()
    print(f"  Tentativa {attempt+1}: {health}", flush=True)
    if '"bundled":true' in health:
        print("\n✅ Bundle Remotion pronto para renderização!", flush=True)
        break

c.close()
