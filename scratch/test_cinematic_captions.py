import paramiko
import json
import time

VPS_IP = "31.220.92.254"

def test_cinematic_captions():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_IP, username='root', password='fjt@Solutions1', timeout=15)
    
    stdin, stdout, stderr = client.exec_command("docker ps -q --filter name=remotion | head -1")
    cid = stdout.read().decode('utf-8').strip()
    print(f"Container ativo: {cid}")
    
    history_id = f"test_captions_{int(time.time())}"
    
    # Payload real do Diretor enviado pelo usuario
    payload = {
        "historyId": history_id,
        "callbackUrl": "https://httpbin.org/post",
        "composition": {
            "format": "vertical",
            "captionStyle": "pop",
            "primaryColor": "#EAB308",
            "accentColor": "#FFFFFF",
            "scenes": [
                {
                    "index": 0,
                    "imageUrl": "https://darktube.fjt-solutions.com/api/storage/manual_media_1785732825371_1gab5l.png",
                    "captionText": "Você já sentiu que suas emoções são um campo de batalha?",
                    "words": [
                        {"word": " Você", "startInSeconds": 0, "endInSeconds": 0.38},
                        {"word": " já", "startInSeconds": 0.38, "endInSeconds": 0.73},
                        {"word": " sentiu", "startInSeconds": 0.58, "endInSeconds": 0.98},
                        {"word": " que", "startInSeconds": 0.98, "endInSeconds": 1.33},
                        {"word": " suas", "startInSeconds": 1.1, "endInSeconds": 1.45},
                        {"word": " emoções", "startInSeconds": 1.28, "endInSeconds": 1.9},
                        {"word": " são", "startInSeconds": 1.9, "endInSeconds": 2.25},
                        {"word": " um", "startInSeconds": 2.06, "endInSeconds": 2.41},
                        {"word": " campo", "startInSeconds": 2.2, "endInSeconds": 2.55},
                        {"word": " de", "startInSeconds": 2.48, "endInSeconds": 2.83},
                        {"word": " batalha?", "startInSeconds": 2.62, "endInSeconds": 3.5}
                    ],
                    "durationSeconds": 4.5,
                    "animationStyle": "zoom-punch",
                    "transitionIn": "slide-right",
                    "textEffect": "split-bounce",
                    "springPreset": "bouncy",
                    "overlayEffect": "light-leak",
                    "colorGrading": "cinematic",
                    "intensity": 0.92,
                    "emotionColor": "#3B0764"
                }
            ]
        }
    }
    
    sftp = client.open_sftp()
    with sftp.open('/tmp/test_captions_payload.json', 'w') as f:
        f.write(json.dumps(payload))
    sftp.close()
    
    client.exec_command(f"docker cp /tmp/test_captions_payload.json {cid}:/tmp/payload_captions.json")
    
    node_code = "const http=require('http'),fs=require('fs');const d=fs.readFileSync('/tmp/payload_captions.json');const req=http.request('http://127.0.0.1:3001/render',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':d.length}},res=>{res.on('data',b=>console.log('SERVER RESPONSE:',b.toString()))});req.on('error',console.error);req.write(d);req.end();"
    stdin, stdout, stderr = client.exec_command(f'docker exec {cid} node -e "{node_code}"')
    print("Render trigger:", stdout.read().decode('utf-8'))
    
    output_filename = f"render_{history_id}.mp4"
    print(f"Monitorando renderizacao de {output_filename}...")
    
    start_time = time.time()
    for attempt in range(40):
        time.sleep(3)
        stdin, stdout, stderr = client.exec_command(f"docker logs --tail 2 {cid}")
        logs = stdout.read().decode('utf-8', errors='replace').encode('ascii', errors='replace').decode('ascii').strip()
        print(f"[{int(time.time() - start_time)}s] {logs}")
        
        stdin, stdout, stderr = client.exec_command(f"docker exec {cid} ls -la /app/output/{output_filename} 2>/dev/null")
        out = stdout.read().decode('utf-8').strip()
        if output_filename in out:
            total_sec = round(time.time() - start_time, 1)
            print(f"\n[SUCESSO COMPLETO EM {total_sec}s!] Video {output_filename} gerado.")
            break
            
    client.close()

if __name__ == '__main__':
    test_cinematic_captions()
