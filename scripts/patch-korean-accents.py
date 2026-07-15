"""
Patch Korean Calligraphy : ajoute les 14 lettres accentuees FR.
Methode : on copie les glyphes d'accent (´ ` ^ " ¸) depuis Arial (qui les a),
puis on compose chaque lettre FR = base coréenne + accent superpose (decale verticalement).
Sortie : korean-calligraphy-accent.ttf (nouveau fichier, non destructif).
"""
from fontTools.ttLib import TTFont

SRC = r"C:\Users\tsall\Projects\Application Tirage Tarot\tarot_app\nextjs_space\public\fonts\korean-calligraphy.ttf"
DONOR = r"C:\Windows\Fonts\arial.ttf"
OUT = r"C:\Users\tsall\Projects\Application Tirage Tarot\tarot_app\nextjs_space\public\fonts\korean-calligraphy-accent-v2.ttf"

# accents combining presents chez Arial (on les copie tels quels)
ACCENT_GLYPHS = {
    0x00B4: 'acute',    # ´
    0x0060: 'grave',    # `
    0x005E: 'circum',   # ^
    0x00A8: 'diaeresis',# ¨
    0x00B8: 'cedilla',  # ¸
}
# cible FR : (base_char, type_accent) -> code point resultat
TARGET = {
    ('a','circum'):0xE2,('e','acute'):0xE9,('e','grave'):0xE8,('e','circum'):0xEA,('e','diaeresis'):0xEB,
    ('i','acute'):0xED,('i','diaeresis'):0xEF,('o','acute'):0xF3,('o','circum'):0xF4,('o','diaeresis'):0xF6,
    ('u','acute'):0xFA,('u','grave'):0xF9,('u','diaeresis'):0xFC,('c','cedilla'):0xE7,
    ('A','acute'):0xC1,('A','grave'):0xC0,('A','circum'):0xC2,('E','acute'):0xC9,('E','grave'):0xC8,
    ('E','circum'):0xCA,('E','diaeresis'):0xCB,('I','acute'):0xCD,('I','diaeresis'):0xCF,
    ('O','acute'):0xD3,('O','circum'):0xD4,('O','diaeresis'):0xD6,('U','acute'):0xDA,('U','grave'):0xD9,
    ('U','diaeresis'):0xDC,('C','cedilla'):0xC7,
}
SHIFT = 430  # decalage vertical de l'accent (unites font)

def main():
    f = TTFont(SRC)
    donor = TTFont(DONOR)
    glyf = f['glyf']
    cmap = f.getBestCmap()
    dcmap = donor.getBestCmap()

    # 1) copier les glyphes d'accent depuis Arial (deepcopy pour eviter partage)
    import copy
    accent_names = {}
    for cp, name in ACCENT_GLYPHS.items():
        if cp not in dcmap:
            print(f"WARN accent U+{cp:04X} absent de Arial"); continue
        gname = dcmap[cp]
        new_gname = f"acc_{name}"
        if new_gname not in glyf.glyphOrder:
            glyf[new_gname] = copy.deepcopy(donor['glyf'][gname])
            if new_gname not in glyf.glyphOrder:
                glyf.glyphOrder.append(new_gname)
            # ajouter une entree hmtx (avance de l'accent Arial, sinon 300)
            dadv = donor['hmtx'].metrics.get(gname, (300, 0))[1]
            f['hmtx'].metrics.setdefault(new_gname, (dadv, 0))
        accent_names[name] = new_gname
        cmap[cp] = new_gname

    # 2) composer les lettres FR
    added = 0
    for (base, acctype), target_cp in TARGET.items():
        # trouver le nom de glyphe deja mappe (meme s'il est vide)
        target_name = cmap.get(target_cp)
        if target_name is None:
            # creer un nouveau nom si vraiment absent
            target_name = f"uni{target_cp:04X}"
        if ord(base) not in cmap:
            print(f"WARN base {base!r} absente"); continue
        if acctype not in accent_names:
            print(f"WARN accent {acctype} non copie"); continue
        base_g = cmap[ord(base)]
        acc_g = accent_names[acctype]
        from fontTools.pens.ttGlyphPen import TTGlyphPen
        pen = TTGlyphPen(glyf)
        pen.addComponent(base_g, (1,0,0,1,0,0))
        pen.addComponent(acc_g, (1,0,0,1,0,SHIFT))
        comp = pen.glyph()
        # remplacer le glyphe existant (pas de nouveau nom -> pas de desync glyphOrder)
        glyf[target_name] = comp
        cmap[target_cp] = target_name
        added += 1

    # 3) mettre a jour hmtx + hhea : avance safe pour eviter chevauchement
    hmtx = f['hmtx']
    hhea = f['hhea']
    glyf = f['glyf']
    UPM = f['head'].unitsPerEm
    GAP = int(UPM * 0.25)  # ~25% d'espace vide avant la lettre suivante
    # cibles = tous les glyphes accentues FR generes
    accent_glyphs = set(cmap[cp] for cp in TARGET.values() if cp in cmap)
    for gname in accent_glyphs:
        if not isinstance(gname, str) or gname not in glyf:
            continue
        g = glyf[gname]
        # largeur visuelle reelle du glyphe composite
        try:
            xmin, ymin, xmax, ymax = g.getBoundingBox()
            vis_w = xmax - xmin
        except Exception:
            vis_w = 500
        # avance = largeur visuelle + espace vide ; au moins 1.2x pour respirer
        adv = max(vis_w + GAP, int(UPM * 0.35))
        old_lsb = hmtx.metrics.get(gname, (0, 0))[0]
        hmtx[gname] = (adv, old_lsb)
    hhea.numberOfHMetrics = len(hmtx.metrics)
    # forcer glyphOrder = toutes les cles reellement dans glyf (evite desync maxp)
    glyf.glyphOrder = list(glyf.glyphs.keys())

    # 4) reconstruire une cmap format 4 propre (platformID=3, platEncID=1)
    from fontTools.ttLib.tables._c_m_a_p import CmapSubtable
    sub4 = CmapSubtable.newSubtable(4)
    sub4.platformID, sub4.platEncID, sub4.language = 3, 1, 0
    sorted_map = {cp: gn for cp, gn in sorted(cmap.items())}
    sub4.cmap = sorted_map
    f['cmap'].tables = [sub4]

    f.save(OUT)
    print(f"OK : {added} glyphes FR ajoutes -> {OUT}")

def newTable_cmap():
    from fontTools.ttLib import newTable
    return newTable('cmap')

if __name__ == '__main__':
    main()
