import os, glob
from PIL import Image

SRC = r"C:/Users/tsall/Projects/Application Tirage Tarot/tarot_app/nextjs_space/public/cards/arcana"
DST = os.path.join(SRC, "optimized")
os.makedirs(DST, exist_ok=True)

MAX_H = 500
QUALITY = 75

total_in = total_out = 0
count = 0
for f in sorted(glob.glob(os.path.join(SRC, "*.png"))):
    im = Image.open(f).convert("RGB")  # JPEG n'a pas d'alpha -> aplatit sur blanc
    w, h = im.size
    if h > MAX_H:
        ratio = MAX_H / h
        im = im.resize((max(1, round(w * ratio)), MAX_H), Image.LANCZOS)
    base = os.path.splitext(os.path.basename(f))[0]
    out = os.path.join(DST, base + ".jpg")
    im.save(out, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    total_in += os.path.getsize(f)
    total_out += os.path.getsize(out)
    count += 1

print(f"count={count} in={total_in/1e6:.1f}Mo out={total_out/1e6:.1f}Mo "
      f"ratio={total_out/total_in*100:.0f}%")
