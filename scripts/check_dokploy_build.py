import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('31.220.92.254', username='root', password='fjt@Solutions1')

stdin, stdout, stderr = c.exec_command('docker service ls | grep -i remotion')
print("Services Remotion:", stdout.read().decode('utf-8').strip())

stdin, stdout, stderr = c.exec_command('docker service ps n8n-remotionservice-ry6eh9 --no-trunc | head -n 5')
print("Service PS:")
print(stdout.read().decode('utf-8', errors='replace'))

c.close()
