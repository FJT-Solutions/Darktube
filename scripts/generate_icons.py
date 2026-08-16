import os
from PIL import Image, ImageDraw

def create_darktube_icon(size):
    # Render at 4x resolution for super crisp anti-aliasing
    scale = 4
    canvas_size = size * scale
    img = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Gradient Background on rounded rectangle
    r = int(canvas_size * 0.22)
    padding = int(canvas_size * 0.04)
    rect_box = [padding, padding, canvas_size - padding, canvas_size - padding]

    # Draw gradient rounded rect
    for i in range(canvas_size):
        ratio = i / canvas_size
        # Crimson gradient from #E11D48 (225, 29, 72) to #991B1B (153, 27, 27)
        cr = int(225 - (225 - 153) * ratio)
        cg = int(29 - (29 - 27) * ratio)
        cb = int(72 - (72 - 27) * ratio)
        # We will draw base rounded rect first
    
    draw.rounded_rectangle(rect_box, radius=r, fill=(225, 29, 72, 255))
    
    # Inner dark display screen
    screen_padding_x = int(canvas_size * 0.16)
    screen_padding_y = int(canvas_size * 0.22)
    screen_r = int(r * 0.7)
    screen_box = [
        screen_padding_x,
        screen_padding_y,
        canvas_size - screen_padding_x,
        canvas_size - screen_padding_y
    ]
    draw.rounded_rectangle(screen_box, radius=screen_r, fill=(15, 15, 18, 245), outline=(255, 255, 255, 45), width=int(scale * 1.5))

    # Center Play Triangle in pure crisp white
    center_x = canvas_size / 2
    center_y = canvas_size / 2
    play_size = canvas_size * 0.16

    pt1 = (center_x - play_size * 0.7 + scale * 2, center_y - play_size)
    pt2 = (center_x + play_size * 0.9 + scale * 2, center_y)
    pt3 = (center_x - play_size * 0.7 + scale * 2, center_y + play_size)

    draw.polygon([pt1, pt2, pt3], fill=(255, 255, 255, 255))

    # Golden Sparkle in top right
    sp_cx = canvas_size - screen_padding_x - int(canvas_size * 0.08)
    sp_cy = screen_padding_y + int(canvas_size * 0.08)
    sp_r = int(canvas_size * 0.05)

    sp_poly = [
        (sp_cx, sp_cy - sp_r),
        (sp_cx + sp_r * 0.3, sp_cy - sp_r * 0.3),
        (sp_cx + sp_r, sp_cy),
        (sp_cx + sp_r * 0.3, sp_cy + sp_r * 0.3),
        (sp_cx, sp_cy + sp_r),
        (sp_cx - sp_r * 0.3, sp_cy + sp_r * 0.3),
        (sp_cx - sp_r, sp_cy),
        (sp_cx - sp_r * 0.3, sp_cy - sp_r * 0.3),
    ]
    draw.polygon(sp_poly, fill=(250, 204, 21, 255))

    # Downscale smoothly to target size
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
    img = create_darktube_icon(sz)
    img.save(path, format='PNG')
    print(f"Generated: {path} ({sz}x{sz})")

print("All DarkTube icons generated successfully!")
