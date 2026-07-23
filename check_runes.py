from fontTools.ttLib import TTFont
f = TTFont('public/fonts/DejaVuSans.ttf')
cmap = f.getBestCmap()
# Elder Futhark runes (subset)
runes = [0x16A0,0x16A2,0x16A6,0x16A8,0x16B1,0x16B3,0x16B7,0x16B9,0x16BB,0x16BE,0x16C1,0x16C2]
have = [hex(c) for c in runes if c in cmap]
miss = [hex(c) for c in runes if c not in cmap]
print("DejaVu runes presentes:", have)
print("DejaVu runes MANQUANTES:", miss)
