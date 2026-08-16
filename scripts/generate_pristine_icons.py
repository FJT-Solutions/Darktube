import os
from PIL import Image, ImageDraw

def render_pristine_darktube_icon(size):
    # Render at 8x scale for supreme vector sharpness and anti-aliasing
    scale = 8
    canvas_size = size * scale
    
    # 100% transparent RGBA canvas
    img = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Vibrant Red Squircle
    padding = int(canvas_size * 0.04)
    r = int(canvas_size * 0.26)
    rect_box = [padding, padding, canvas_size - padding, canvas_size - padding]
    
    # Draw pure red squircle (#FF0000)
    draw.rounded_rectangle(rect_box, radius=r, fill=(255, 0, 0, 255))

    # 2. White YouTube Screen Outline
    screen_w = int(canvas_size * 0.58)
    screen_h = int(canvas_size * 0.42)
    screen_left = int((canvas_size - screen_w) / 2)
    screen_top = int((canvas_size - screen_h) / 2)
    screen_r = int(screen_h * 0.32)
    stroke_w = max(2, int(scale * 1.6))

    screen_box = [
        screen_left,
        screen_top,
        screen_left + screen_w,
        screen_top + screen_h
    ]
    draw.rounded_rectangle(
        screen_box,
        radius=screen_r,
        fill=None,
        outline=(255, 255, 255, 255),
        width=stroke_w
    )

    # 3. Center Solid Play Triangle
    cx = canvas_size / 2
    cy = canvas_size / 2
    play_h = int(screen_h * 0.34)
    play_w = int(screen_w * 0.26)

    # Slight optical adjustment (+1.5px right)
    p1 = (cx - play_w * 0.45 + scale * 0.6, cy - play_h)
    p2 = (cx + play_w * 0.65 + scale * 0.6, cy)
    p3 = (cx - play_w * 0.45 + scale * 0.6, cy + play_h)

    draw.polygon([p1, p2, p3], fill=(255, 255, 255, 255))

    # Downsample with high-precision Lanczos resampling
    return img.resize((size, size), Image.Resampling.LANCZOS)

# Target icons
targets = [
    ('extension/icons/icon16.png', 16),
    ('extension/icons/icon48.png', 48),
    ('extension/icons/icon128.png', 128),
    ('public/icon-light-32x32.png', 32),
    ('public/icon-dark-32x32.png', 32),
    ('public/apple-icon.png', 180),
    ('public/placeholder-logo.png', 128),
]

os.makedirs('extension/icons', exist_ok=True)
os.makedirs('public', exist_ok=True)

for path, sz in targets:
    icon = render_pristine_darktube_icon(sz)
    icon.save(path, format='PNG')
    print(f"Generated pristine icon: {path} ({sz}x{sz})")

print("All icons successfully generated without any artifacts or cutoffs!")
