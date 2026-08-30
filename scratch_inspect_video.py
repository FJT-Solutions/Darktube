import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("31.220.92.254", username='root', password='fjt@Solutions1', timeout=15)

script = """
python3 -c "
import cv2
import numpy as np

cap = cv2.VideoCapture('/app/output/darkclip_39e1be51-27a0-471e-a40c-83cc49ccfef1.mp4')
ret, frame = cap.read()
if ret:
    print('Frame shape:', frame.shape)
    h, w, _ = frame.shape
    # Check brightness / color of left and right column along y
    left_edge = frame[:, 5, :]
    right_edge = frame[:, w - 6, :]
    print('Sample left edge values every 50px:')
    for y in range(0, h, 50):
        print(f'y={y}: left={left_edge[y].tolist()} right={right_edge[y].tolist()}')
cap.release()
"
"""

stdin, stdout, stderr = client.exec_command(f"""
cid=$(docker ps -q --filter name=remotion | head -1)
docker exec $cid python3 -c "
import subprocess
try:
    # Run ffprobe / ffmpeg scan
    res = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,duration', '-of', 'json', '/app/output/input_39e1be51-27a0-471e-a40c-83cc49ccfef1_clean.mp4'], capture_output=True, text=True)
    print(res.stdout)
except Exception as e:
    print(e)
"
""")

import sys
sys.stdout.buffer.write(stdout.read())
client.close()
