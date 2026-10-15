# scripts/_gen_splash.py — Sprites de démarrage Android : nuit profonde + étoiles discrètes + logo.
# Écrase android/app/src/main/res/drawable-{port,land}-{m,x,xx,xxx}hdpi/splash.png + drawable/splash.png.
# Relancer après chaque changement de logo : node scripts/gen-splash.cjs
from PIL import Image, ImageDraw, ImageFilter
import os, random, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO = os.path.join(ROOT, 'public', 'logo-espace.png')
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')

# Palette nuit profonde (cohérente avec le voile in-app #0a0604 / indigo #150d24)
GRADIENT_STOPS = [(0.0, (7, 5, 18)), (0.30, (13, 8, 26)), (0.68, (9, 6, 12)), (1.0, (4, 3, 8))]
STAR_COLORS = [(255, 255, 255), (255, 244, 214), (214, 236, 255), (225, 240, 255)]


def base_gradient(w, h):
    """Dégradé vertical nuit profonde via table de couleurs 1px, redimensionné."""
    lut = Image.new('RGB', (1, h))
    px = lut.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        for i in range(len(GRADIENT_STOPS) - 1):
            t0, c0 = GRADIENT_STOPS[i]
            t1, c1 = GRADIENT_STOPS[i + 1]
            if t0 <= t <= t1:
                f = (t - t0) / (t1 - t0) if t1 > t0 else 0.0
                px[0, y] = tuple(int(c0[k] + (c1[k] - c0[k]) * f) for k in range(3))
                break
    return lut.resize((w, h), Image.BILINEAR)


def nebula_tint(img, w, h, seed):
    """Légère brume indigo décentrée : touche de fond, très discrète."""
    rnd = random.Random(seed * 7 + 1)
    layer = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(layer)
    for _ in range(2):
        cx = rnd.randint(int(w * 0.2), int(w * 0.8))
        cy = rnd.randint(int(h * 0.1), int(h * 0.45))
        r = rnd.randint(max(w, h) // 4, max(w, h) // 2)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=rnd.randint(16, 26))
    layer = layer.filter(ImageFilter.GaussianBlur(radius=max(w, h) // 18))
    tint = Image.new('RGB', (w, h), (24, 14, 44))
    return Image.composite(tint, img, layer)


def draw_stars(img, w, h, seed, density):
    """Petites étoiles très discrètes : 1 px pour la plupart, quelques-unes à 2 px."""
    rnd = random.Random(seed)
    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    n = int(w * h / density)
    for _ in range(n):
        x = rnd.uniform(0, w - 1)
        y = rnd.uniform(0, h - 1)
        c = rnd.choice(STAR_COLORS)
        a = rnd.randint(50, 150)  # discrètes : alpha max ~0.6
        big = rnd.random() < 0.04
        if big:
            d.ellipse([x - 1.5, y - 1.5, x + 1.5, y + 1.5], fill=c + (min(a + 60, 210),))
            halo = Image.new('RGBA', (w, h), (0, 0, 0, 0))
            ImageDraw.Draw(halo).ellipse([x - 4, y - 4, x + 4, y + 4], fill=c + (28,))
            img.alpha_composite(halo.filter(ImageFilter.GaussianBlur(2.0)))
        else:
            d.point((int(x), int(y)), fill=c + (a,))
    img.alpha_composite(overlay)
    # garde-fou : quelques étoiles un peu plus brillantes, toujours fines
    return img


def generate(w, h, orientation, seed):
    bg = base_gradient(w, h).convert('RGBA')
    bg = nebula_tint(bg, w, h, seed)
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    canvas.paste(bg, (0, 0))
    density = 9000 if orientation == 'port' else 10500
    draw_stars(canvas, w, h, seed, density)

    logo = Image.open(LOGO).convert('RGBA')
    target_w = int(w * (0.52 if orientation == 'port' else 0.36))
    target_w = min(target_w, int(h * 0.38 * (logo.width / logo.height)))
    scale = target_w / logo.width
    logo = logo.resize((int(logo.width * scale), int(logo.height * scale)), Image.LANCZOS)
    canvas.alpha_composite(logo, ((w - logo.width) // 2, int(h * 0.5 - logo.height // 2)))
    return canvas.convert('RGB')


SIZES = {
    # Ratio ~1:2.166 (téléphones modernes 20:9) : le drawable est étiré par Android
    # pour remplir la fenêtre — un ratio proche évite toute déformation du logo.
    'mdpi': (360, 780), 'hdpi': (540, 1170), 'xhdpi': (720, 1560),
    'xxhdpi': (1080, 2340), 'xxxhdpi': (1440, 3120),
}


def splash_logo(canvas_px):
    """ICône du splash Android 12+ (values-v31) : logo centré dans la zone sûre
    du masque circulaire (2/3 du gabarit), fond transparent."""
    logo = Image.open(LOGO).convert('RGBA')
    target = int(canvas_px * 0.55)  # dans le cercle sûr du masque système (~2/3 du gabarit)
    scale = target / logo.width
    logo = logo.resize((target, int(logo.height * scale)), Image.LANCZOS)
    out = Image.new('RGBA', (canvas_px, canvas_px), (0, 0, 0, 0))
    out.alpha_composite(logo, ((canvas_px - logo.width) // 2, (canvas_px - logo.height) // 2))
    return out

written = []
for i, (dpi, (pw, ph)) in enumerate(SIZES.items()):
    for orientation, (w, h) in (('port', (pw, ph)), ('land', (ph, pw))):
        folder = os.path.join(RES, f'drawable-{orientation}-{dpi}')
        out = os.path.join(folder, 'splash.png')
        if os.path.isdir(folder):
            generate(w, h, orientation, seed=1000 + i * 31 + (0 if orientation == 'port' else 7)).save(out)
            written.append(out)
# dossier par défaut (sans qualificatif) : portrait mdpi
generate(*SIZES['mdpi'], 'port', seed=999).save(os.path.join(RES, 'drawable', 'splash.png'))
written.append(os.path.join(RES, 'drawable', 'splash.png'))

# icône du splash Android 12+ (windowSplashScreenAnimatedIcon → values-v31/styles.xml)
icon_dir = os.path.join(RES, 'drawable-nodpi')
os.makedirs(icon_dir, exist_ok=True)
splash_logo(800).save(os.path.join(icon_dir, 'splash_logo.png'))
written.append(os.path.join(icon_dir, 'splash_logo.png'))
print(f'{len(written)} fichiers générés')
