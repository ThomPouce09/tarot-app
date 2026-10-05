#!/usr/bin/env python3
"""Preuve de DEPLACEMENT PUR. usage: _pure3.py <ref> <ancien> <nouveaux...>"""
import collections
import subprocess
import sys

ref, old_path = sys.argv[1], sys.argv[2]
new_files = sys.argv[3:]


def code_lines(text):
    out = []
    for raw in text.split('\n'):
        s = raw.strip()
        if s.startswith('export '):
            s = s[len('export '):].strip()
        if not s or s.startswith("'use client'"):
            continue
        if s.startswith('import ') or s.startswith('} from ') or s.startswith('  '):
            continue
        if s.startswith('//') or s.startswith('/*') or s.startswith('*'):
            continue
        out.append(s)
    return out


old = subprocess.run(['git', 'show', f'{ref}:{old_path}'], capture_output=True).stdout.decode('utf-8')
new = ''.join(open(p, encoding='utf-8').read() + '\n' for p in new_files)
a, b = collections.Counter(code_lines(old)), collections.Counter(code_lines(new))
lost, added = a - b, b - a
print(f'avant={sum(a.values())}  apres={sum(b.values())}')
if not lost and not added:
    print('==> IDENTIQUE : aucune ligne de code perdue ni modifiee.')
else:
    print(f'--- {sum(lost.values())} PERDUE(S)/MODIFIEE(S) ---')
    for ln, n in list(lost.items())[:15]:
        print(f'  x{n}  {ln[:100]}')
    print(f'--- {sum(added.values())} AJOUTEE(S) ---')
    for ln, n in list(added.items())[:15]:
        print(f'  x{n}  {ln[:100]}')
