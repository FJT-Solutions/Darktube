import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("31.220.92.254", username='root', password='fjt@Solutions1', timeout=15)

script = """
const { execSync } = require('child_process');
const fs = require('fs');

// Download original clip from storage if available
const testVideo = '/app/output/test_input.mp4';
execSync('curl -s https://darktube.fjt-solutions.com/api/storage/clip_1788104954832_4n80c.mp4 -o /app/output/test_input.mp4');

// 1. Get exact duration
const durStr = execSync('ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 /app/output/test_input.mp4').toString().trim();
console.log('Original Video Duration:', durStr, 'seconds');

// 2. Get exact width and height
const dimStr = execSync('ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 /app/output/test_input.mp4').toString().trim();
const [w, h] = dimStr.split(',').map(Number);
console.log('Original Dimensions:', w, 'x', h);

// 3. Extract 5 frames across the video and check black border boundaries
execSync('ffmpeg -ss 00:00:05 -i /app/output/test_input.mp4 -vframes 1 -f rawvideo -pix_fmt rgb24 /app/output/frame.raw -y');
const buf = fs.readFileSync('/app/output/frame.raw');

// Scan horizontal lines for black margins vs active video
// In a meme video, columns near x=0 and x=w-1 are black in header/footer, and colored in video
let topY = 0;
let bottomY = h;

// Check row by row: count how many non-black pixels are on the left (x=5) and right (x=w-5)
console.log('--- Scanning vertical boundaries ---');
for (let y = 0; y < h; y += 10) {
  const leftIdx = (y * w + 10) * 3;
  const rightIdx = (y * w + (w - 10)) * 3;
  const rL = buf[leftIdx], gL = buf[leftIdx+1], bL = buf[leftIdx+2];
  const rR = buf[rightIdx], gR = buf[rightIdx+1], bR = buf[rightIdx+2];
  const isLeftBlack = (rL < 30 && gL < 30 && bL < 30);
  const isRightBlack = (rR < 30 && gR < 30 && bR < 30);
  if (!isLeftBlack || !isRightBlack) {
    console.log(`y=${y}: NOT black -> Left=(${rL},${gL},${bL}) Right=(${rR},${gR},${bR})`);
  }
}
"""

sftp = client.open_sftp()
with sftp.open('/tmp/test_detect.js', 'w') as f:
    f.write(script)
sftp.close()

stdin, stdout, stderr = client.exec_command("""
cid=$(docker ps -q --filter name=remotion | head -1)
docker cp /tmp/test_detect.js $cid:/app/test_detect.js
docker exec $cid node /app/test_detect.js
""")

import sys
sys.stdout.buffer.write(stdout.read())
client.close()
