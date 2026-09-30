import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("31.220.92.254", port=22, username="root", password="fjt@Solutions1", timeout=15)

_, o, _ = c.exec_command("docker ps --filter name=n8n-remotionservice --format '{{.ID}} {{.Names}} {{.Status}}'")
print("Active Remotion containers:")
print(o.read().decode())

_, o, _ = c.exec_command("docker service ps n8n-remotionservice-ry6eh9")
print("Docker Swarm Service status:")
print(o.read().decode())

c.close()
