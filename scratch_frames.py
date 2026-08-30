import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("31.220.92.254", username='root', password='fjt@Solutions1', timeout=15)

stdin, stdout, stderr = client.exec_command("""
cid=$(docker ps -q --filter name=remotion | head -1)
echo "=== RENDERED FRAMES IN TMP ==="
docker exec $cid find /tmp/ -name "*.jpeg" | wc -l
docker exec $cid ls -l /tmp/react-motion* 2>/dev/null
""")

print(stdout.read().decode('utf-8', errors='replace'))
client.close()
