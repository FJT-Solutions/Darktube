import paramiko

HOST = "31.220.92.254"
USER = "root"
PASS = "fjt@Solutions1"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

# 1. Get container id
stdin, stdout, stderr = ssh.exec_command('docker ps -q -f name=n8n-remotionservice | head -n1')
cid = stdout.read().decode().strip()
print(f"Container ID: {cid}")

# 2. Upload LoopEngineering.tsx to host
sftp = ssh.open_sftp()
sftp.put(r"c:\Users\natha\Documents\project\darktube\remotion\compositions\templates\LoopEngineering.tsx", "/tmp/LoopEngineering.tsx")
sftp.close()
print("Uploaded LoopEngineering.tsx to /tmp")

# 3. Copy into container
stdin, stdout, stderr = ssh.exec_command(f"docker cp /tmp/LoopEngineering.tsx {cid}:/app/remotion/compositions/templates/LoopEngineering.tsx")
print("docker cp output:", stdout.read().decode(), stderr.read().decode())

# 4. Trigger rebundle
stdin, stdout, stderr = ssh.exec_command(f"docker exec {cid} curl -s -X POST http://127.0.0.1:3001/rebundle")
print("Rebundle output:", stdout.read().decode(), stderr.read().decode())

ssh.close()
print("Finished sync and rebundle.")
