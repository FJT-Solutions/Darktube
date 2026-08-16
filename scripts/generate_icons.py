import os
from PIL import Image, ImageDraw

def create_exact_darktube_icon(size):
    # Render at 4x for smooth anti-aliased geometry
    scale = 4
    canvas_size = size * scale
    img = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Vibrant Red Squircle (#FF0000)
    r = int(canvas_size * 0.28)
    padding = int(canvas_size * 0.02)
    rect_box = [padding, padding, canvas_size - padding, canvas_size - padding]
    draw.rounded_rectangle(rect_box, radius=r, fill=(255, 0, 0, 255))

    # 2. White YouTube Screen Outline
    screen_pad_x = int(canvas_size * 0.22)
    screen_pad_y = int(canvas_size * 0.28)
    screen_r = int(canvas_size * 0.14)
    line_w = max(2, int(scale * 1.8))
    
    screen_box = [
        screen_pad_x,
        screen_pad_y,
        canvas_size - screen_pad_x,
        canvas_size - screen_pad_y
    ]
    draw.rounded_rectangle(
        screen_box, 
        radius=screen_r, 
        fill=None, 
        outline=(255, 255, 255, 255), 
        width=line_w
    )

    # 3. Center Play Triangle
    cx = canvas_size / 2
    cy = canvas_size / 2
    play_h = int(canvas_size * 0.11)
    play_w = int(canvas_size * 0.12)

    p1 = (cx - play_w * 0.45 + scale * 0.8, cy - play_h)
    p2 = (cx + play_w * 0.65 + scale * 0.8, cy)
    p3 = (cx - play_w * 0.45 + scale * 0.8, cy + play_h)

    draw.polygon([p1, p2, p3], fill=(255, 255, 255, 255))

    # Downsample smoothly with Lanczos filter
    return img.resize((size, size), Image.Resampling.LANCZOS)

targets = [
    ('public/icon-light-32x32.png', 32),
    ('public/icon-dark-32x32.png', 32),
    ('public/apple-icon.png', 180),
    ('public/placeholder-logo.png', 128),
    ('extension/icons/icon16.png', 16),
    ('extension/icons/icon48.png', 48),
    ('extension/icons/icon128.png', 128),
]

os.makedirs('public', exist_ok=True)
os.makedirs('extension/icons', exist_ok=True)

for path, sz in targets:
    icon_img = create_exact_darktube_icon(sz)
    icon_img.save(path, format='PNG')
    print(f"Generated exact DarkTube icon: {path} ({sz}x{sz})")

print("All exact DarkTube icons generated successfully!")
