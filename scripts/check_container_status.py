import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('31.220.92.254', username='root', password='fjt@Solutions1')

stdin, stdout, stderr = c.exec_command('docker ps --format "{{.ID}} | {{.Names}} | {{.CreatedAt}} | {{.Status}}"\n')
print("Containers:\n", stdout.read().decode('utf-8', errors='replace'))
stdin, stdout, stderr = c.exec_command('for cid in $(docker ps -q -f name=remotion); do echo "=== Container $cid ==="; docker logs --tail 15 $cid; done')
print("Logs:\n", stdout.read().decode('utf-8', errors='replace'))

c.close()
