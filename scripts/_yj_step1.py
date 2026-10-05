#!/usr/bin/env python3
"""yi-jing-simple : etape 1/2 - sort le bloc de CONFIG (constantes, interfaces,
fonctions pures) vers rig-config.ts.

Le bloc 13-145 est totalement autonome (aucune dependance externe, seulement
Math). La liste des noms a importer dans page.tsx est CALCULEE a partir de
l'usage reel dans le reste du fichier (pas tapee a la main).
"""
import os
import re

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(BASE, 'app', 'yi-jing-simple')
SRC = os.path.join(DIR, 'page.tsx')
DST = os.path.join(DIR, 'rig-config.ts')

R = (13, 145)

with open(SRC, encoding='utf-8', newline='') as f:
    raw = f.read()
nl = '\r\n' if '\r\n' in raw else '\n'
lines = raw.split(nl)
if lines and lines[-1] == '':
    lines.pop()
total = len(lines)

# --- garde-fous d'entree ---
assert lines[12].startswith('const YI_QING_BG'), lines[12][:60]
assert lines[79].startswith('const RESULT_TEXT_SPACING'), lines[79][:60]
assert lines[83].startswith('interface MotionState'), lines[83][:60]
assert lines[110] == '}', repr(lines[110])
assert lines[112].startswith('function makeSticks'), lines[112][:60]
assert lines[141].startswith('function getStickRise'), lines[141][:60]
assert lines[144] == '}', repr(lines[144])
assert lines[147].startswith('function YiQingRig'), lines[147][:60]

block = [lines[i - 1] for i in range(R[0], R[1] + 1)]
rest = '\n'.join(lines[R[1]:])   # ce qui reste dans page.tsx

DECL = re.compile(r'^(const|function|interface)\s+([A-Za-z0-9_$]+)')
decls = []
for ln in block:
    m = DECL.match(ln)
    if m:
        decls.append((m.group(1), m.group(2)))

to_import = [name for kind, name in decls if re.search(r'\b' + re.escape(name) + r'\b', rest)]
types = [name for kind, name in decls if kind == 'interface' and name in to_import]
vals = [name for name in to_import if name not in types]
skipped = [name for kind, name in decls if name not in to_import]
print(f'declarations     : {len(decls)}')
print(f'a importer       : {len(to_import)}  (dont {len(types)} type(s))')
print(f'non importes     : {len(skipped)} -> {", ".join(skipped)}')

# Tout est exporte : ce fichier EST l'API de configuration de la page.
exported = []
for kind, name in decls:
    pass
out_block = []
for ln in block:
    m = DECL.match(ln)
    if m:
        ln = 'export ' + ln
    out_block.append(ln)

config = [
    '// Configuration du rig de /yi-jing-simple (etape 1/2 du decoupage).',
    '// Constantes de reglage (physique des baguettes, mise en page, animations),',
    '// interfaces et fonctions PURES. Bloc autonome : aucune dependance externe.',
    '',
] + out_block + ['']

import_block = [
    '// Configuration du rig, extraite a l\'etape 1 du decoupage.',
    'import {',
    '  ' + ', '.join(vals) + ',',
] + (['  type ' + ', type '.join(types) + ','] if types else []) + [
    "} from './rig-config';",
]

kept = lines[:R[0] - 1] + lines[R[1]:]
new_page = kept[:11] + import_block + kept[11:]

# --- garde-fous de sortie ---
for need in ('YiQingRig', 'YiQingPage', 'GatedPage'):
    assert any(need in ln for ln in new_page), f'{need} a disparu de page.tsx !'
for gone in ('const YI_QING_BG', 'function makeSticks', 'function getStickRise', 'interface MotionState'):
    assert not any(gone in ln for ln in new_page), f'{gone} encore dans page.tsx'
for kind, name in decls:
    assert any(ln.startswith('export ') and name in ln for ln in out_block), f'{name} non exporte !'
assert 'Math.random' in '\n'.join(out_block), 'makeSticks semble avoir perdu son corps'

with open(DST, 'w', encoding='utf-8', newline='') as f:
    f.write(nl.join(config))
with open(SRC, 'w', encoding='utf-8', newline='') as f:
    f.write(nl.join(new_page))

print(f'page.tsx    : {total} -> {len(new_page)} lignes')
print(f'rig-config  : {len(config)} lignes')
print('doubles CR page  :', open(SRC, 'rb').read().count(b'\r\r\n'))
print('doubles CR config:', open(DST, 'rb').read().count(b'\r\r\n'))
