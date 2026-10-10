"""Convertit les woff2 de public/fonts en TTF exploitables par resvg
(resvg / fontdb ne décode pas le woff2) pour le rendu du bandeau de la lettre.
Usage : python scripts/_woff2-to-ttf.py
Sortie : public/fonts/_email/*.ttf
"""
import os
from fontTools.ttLib import TTFont

SRC = os.path.join('public', 'fonts')
OUT = os.path.join(SRC, '_email')
PAIRS = [
    ('cinzel-decorative-latin-700.woff2', 'CinzelDecorative-Bold.ttf'),
    ('cinzel-decorative-latin-400.woff2', 'CinzelDecorative-Regular.ttf'),
    ('cormorant-garamond-latin-400-700.woff2', 'CormorantGaramond-Regular.ttf'),
]

os.makedirs(OUT, exist_ok=True)
for src, dst in PAIRS:
    sp = os.path.join(SRC, src)
    if not os.path.exists(sp):
        print('absent, ignoré :', src)
        continue
    t = TTFont(sp)
    t.flavor = None  # woff2 -> TTF brut
    dp = os.path.join(OUT, dst)
    t.save(dp)
    print('->', dp, os.path.getsize(dp) // 1024, 'Ko')
