import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { numero: string } }
) {
  const numero = parseInt(params.numero, 10);
  if (isNaN(numero)) {
    return NextResponse.json({ found: false, error: 'numero invalide' }, { status: 400 });
  }
  try {
    // Lecture directe de la table seedée 'hexagrams' (non déclarée dans le schéma Prisma)
    // -> aucune modification de schéma, lecture seule.
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT h.*, e.name_en, e.synthese_en, s.name_es, s.synthese_es, i.name_hi, i.synthese_hi
       FROM "hexagrams" h
       LEFT JOIN "hexagrams_en" e ON e.numero = h.numero
       LEFT JOIN hexagrams_es s ON s.numero = h.numero
       LEFT JOIN hexagrams_hi i ON i.numero = h.numero
       WHERE h.numero = $1 LIMIT 1`,
      numero
    )) as Array<Record<string, any>>;

    const hex = rows[0];
    if (!hex) {
      return NextResponse.json({ found: false }, { status: 404 });
    }
    return NextResponse.json({
      found: true,
      hexagram: {
        numero: hex.numero,
        // Schéma réel de la table : caractere / pinyin / element / synthese ...
        name: hex.element || null,            // nom court (ex "Matérialisation")
        frenchName: hex.element || null,       // alias pour compat
        glyph: hex.caractere || null,
        ideogram: hex.caractere || null,
        pinyin: hex.pinyin || null,            // prononciation
        synthese: hex.synthese || null,        // synthèse longue FR (affichée en fin, petite)
        name_en: hex.name_en || null,          // nom canonique EN
        synthese_en: hex.synthese_en || null,  // synthèse EN
        name_es: hex.name_es || null,          // nom canonique ES
        synthese_es: hex.synthese_es || null,  // synthèse ES
        name_hi: hex.name_hi || null,          // nom HI (devanagari)
        synthese_hi: hex.synthese_hi || null,  // synthèse HI (devanagari)
        trigramSuperior: hex.element || null,
        trigramInferior: null,
        semanticEssence: null,                 // supprimé (redondant)
      },
    });
  } catch (err) {
    return NextResponse.json(
      { found: false, error: String(err) },
      { status: 500 }
    );
  }
}
