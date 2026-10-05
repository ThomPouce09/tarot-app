#!/usr/bin/env python3
"""Auto-heberge les 4 familles Google utilisees par app/layout.tsx.

Pourquoi : `next/font/google` telechargeait les polices a CHAQUE `next build`.
Google injoignable => build entier en echec (`An error occurred in next/font`),
de facon aleatoire. En hebergeant les fichiers dans public/fonts et en declarant
les @font-face localement, le build ne touche plus au reseau.

Sortie : public/fonts/*.woff2 + app/fonts-google-local.css (regenere a chaque run).
Usage  : python scripts/fetch-google-fonts.py
"""
import os
import re
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(ROOT)  # remonte de scripts/ vers la racine du projet
FONTS_DIR = os.path.join(ROOT, 'public', 'fonts')
CSS_OUT = os.path.join(ROOT, 'app', 'fonts-google-local.css')

UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

# (parametre CSS API, prefixe de fichier, nom de famille, variable CSS)
FAMILIES = [
    ('Cinzel:wght@400..700', 'cinzel', 'Cinzel', '--font-cinzel'),
    ('Cinzel+Decorative:wght@400;700', 'cinzel-decorative', 'Cinzel Decorative', '--font-cinzel-deco'),
    ('MedievalSharp', 'medievalsharp', 'MedievalSharp', '--font-medieval'),
    ('Cormorant+Garamond:wght@400..700', 'cormorant-garamond', 'Cormorant Garamond', '--font-cormorant'),
]
# latin couvre deja les accents francais (U+0000-00FF) ; latin-ext ajoute le reste.
KEEP_RANGES = {'latin', 'latin-ext'}


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read()


def main():
    os.makedirs(FONTS_DIR, exist_ok=True)
    rules, variables, failures = [], [], []

    for param, prefix, family, css_var in FAMILIES:
        css = fetch(f'https://fonts.googleapis.com/css2?family={param}&display=swap').decode('utf-8')
        blocks = re.findall(r'/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*\{[^}]*\})', css)
        variables.append(f"  {css_var}: '{family}', serif;")
        kept = []
        for range_name, block in blocks:
            if range_name not in KEEP_RANGES:
                continue
            weight = re.search(r'font-weight:\s*([\d\s]+);', block).group(1).strip()
            style = re.search(r'font-style:\s*(\w+)', block).group(1)
            src = re.search(r'url\((https://[^)]+\.woff2)\)', block).group(1)
            # Le POIDS fait partie du nom : sinon 400 et 700 s'ecrasent.
            tag = weight.replace(' ', '-')
            fname = f'{prefix}-{range_name}-{tag}.woff2'
            data = fetch(src)
            if data[:4] != b'wOF2':
                failures.append(f'{fname}: magic bytes invalides ({data[:4]!r})')
                continue
            with open(os.path.join(FONTS_DIR, fname), 'wb') as f:
                f.write(data)
            kept.append(f'{fname} ({len(data) // 1024} Ko)')
            rules.append(
                "@font-face {\n"
                f"  font-family: '{family}';\n"
                f"  src: url('/fonts/{fname}') format('woff2');\n"
                f"  font-weight: {weight};\n"
                f"  font-style: {style};\n"
                "  font-display: swap;\n"
                "}"
            )
        print(f'{family}: {len(kept)} fichier(s)')
        for k in kept:
            print(f'   - {k}')

    header = (
        "/* ------------------------------------------------------------------\n"
        "   Polices Google AUTO-HEBERGEES (aucune dependance reseau au build).\n"
        "   Fichiers : public/fonts/*.woff2\n"
        "   Regenere par : python scripts/fetch-google-fonts.py\n"
        "   ------------------------------------------------------------------ */\n\n"
        ":root {\n" + "\n".join(variables) + "\n}\n\n"
    )
    with open(CSS_OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(header + '\n\n'.join(rules) + '\n')

    print(f'\nCSS ecrit : {CSS_OUT}')
    print(f'fichiers  : {len(rules)}')
    if failures:
        print(f'ECHECS ({len(failures)}): ' + '; '.join(failures))
        raise SystemExit(1)


if __name__ == '__main__':
    main()
