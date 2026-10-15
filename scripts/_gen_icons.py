# scripts/_gen_icons.py — Icônes Android (launcher + badge de notifications) à partir
# du nouveau logo public/logo-espace.png. Fond = nuit profonde (cohérent splash).
# Écrase mipmap-*/ic_launcher[_round][_foreground][_background].png (toutes densités).
from PIL import Image, ImageDraw
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO = os.path.join(ROOT, 'public', 'logo-espace.png')
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')

# drapeau legacy : icône pleine = fond nuit + logo (les lanceurs arrondiront)
SIZES = {'ldpi': 36, 'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
# adaptive (API 26+) : canvas 108dp -> px par dpi ; foreground fond transparent
ADAPTIVE = {'ldpi': 81, 'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}

NIGHT_TOP = (19, 16, 49)
NIGHT_BOT = (5, 3, 16)


def night_bg(px):
    """Dégradé vertical nuit + micro-étoiles fixes (discrètes, déterministes)."""
    im = Image.new('RGB', (px, px))
    d = ImageDraw.Draw(im)
    for y in range(px):
        t = y / max(px - 1, 1)
        c = tuple(int(NIGHT_TOP[k] + (NIGHT_BOT[k] - NIGHT_TOP[k]) * t) for k in range(3))
        d.line([(0, y), (px, y)], fill=c)
    # étoiles : grille pseudo-aléatoire déterministe, 1 px, alpha doux via couleur
    import math
    for i in range(14):
        x = (13 * i * i + 7 * i + 3) % px
        y = (29 * i + 11 * (i // 3) + 5) % px
        if 0 < x < px - 1 and 0 < y < px - 1:
            d.point((x, y), fill=(210, 215, 235))
    return im.convert('RGBA')


def logo_resized(target_w):
    logo = Image.open(LOGO).convert('RGBA')
    scale = target_w / logo.width
    return logo.resize((target_w, max(1, int(logo.height * scale))), Image.LANCZOS)


def place(canvas, logo):
    canvas.alpha_composite(logo, ((canvas.width - logo.width) // 2,
                                  int(canvas.height * 0.5 - logo.height // 2)))


def round_mask(px):
    m = Image.new('L', (px, px), 0)
    ImageDraw.Draw(m).ellipse([0, 0, px - 1, px - 1], fill=255)
    return m


for dpi, px in SIZES.items():
    d = os.path.join(RES, f'mipmap-{dpi}')
    if not os.path.isdir(d):
        continue
    base = night_bg(px)
    lg = logo_resized(int(px * 0.78))
    full = base.copy()
    place(full, lg)
    full.convert('RGBA').save(os.path.join(d, 'ic_launcher.png'))
    r = round_mask(px)
    im2 = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    im2.paste(full, (0, 0), r)
    im2.save(os.path.join(d, 'ic_launcher_round.png'))

for dpi, px in ADAPTIVE.items():
    d = os.path.join(RES, f'mipmap-{dpi}')
    if not os.path.isdir(d):
        continue
    # foreground : zone sûre = cercle de 66,7 % du canvas -> logo <= ~0,60 de la largeur
    fg = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    lg = logo_resized(int(px * 0.60))
    place(fg, lg)
    fg.save(os.path.join(d, 'ic_launcher_foreground.png'))
    night_bg(px).convert('RGBA').save(os.path.join(d, 'ic_launcher_background.png'))

print('icônes régénérées depuis logo-espace.png')
