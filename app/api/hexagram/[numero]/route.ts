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
      `SELECT * FROM "hexagrams" WHERE numero = $1 LIMIT 1`,
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
        synthese: hex.synthese || null,        // synthèse longue (affichée en fin, petite)
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
