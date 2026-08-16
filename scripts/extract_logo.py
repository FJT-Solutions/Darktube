from PIL import Image
import os

img = Image.open('public/darktube-logo.png').convert('RGBA')
w, h = img.size

# Find the bounding box of the red icon on the left
# The icon is around x=0 to x=64, y=0 to y=61
# Let's find pixels where red is prominent (r > 150 and r > g * 1.5)
left, top, right, bottom = w, h, 0, 0
for y in range(h):
    for x in range(int(w * 0.45)):
        r, g, b, a = img.getpixel((x, y))
        if a > 30 and r > 100:
            left = min(left, x)
            top = min(top, y)
            right = max(right, x)
            bottom = max(bottom, y)

print(f"Icon bbox: ({left}, {top}, {right}, {bottom})")

# Crop the exact red icon
padding = 1
icon_crop = img.crop((max(0, left - padding), max(0, top - padding), min(w, right + padding + 1), min(h, bottom + padding + 1)))

# Make it square
iw, ih = icon_crop.size
max_dim = max(iw, ih)
square_icon = Image.new('RGBA', (max_dim, max_dim), (0, 0, 0, 0))
offset_x = (max_dim - iw) // 2
offset_y = (max_dim - ih) // 2
square_icon.paste(icon_crop, (offset_x, offset_y), icon_crop)

# Generate all target sizes
os.makedirs('extension/icons', exist_ok=True)
os.makedirs('public', exist_ok=True)

square_icon.resize((16, 16), Image.Resampling.LANCZOS).save('extension/icons/icon16.png')
square_icon.resize((48, 48), Image.Resampling.LANCZOS).save('extension/icons/icon48.png')
square_icon.resize((128, 128), Image.Resampling.LANCZOS).save('extension/icons/icon128.png')

square_icon.resize((32, 32), Image.Resampling.LANCZOS).save('public/icon-light-32x32.png')
square_icon.resize((32, 32), Image.Resampling.LANCZOS).save('public/icon-dark-32x32.png')
square_icon.resize((180, 180), Image.Resampling.LANCZOS).save('public/apple-icon.png')

# Also save the full logo to extension/icons/logo.png
img.save('extension/icons/logo.png')
img.save('public/darktube-logo.png')

print("All exact logo PNGs generated successfully from the original image!")
