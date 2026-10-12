import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TAROT_CARDS } from '@/lib/tarot-data';
import { sanitizeWheelInterpretation } from '@/lib/tarot-semaine';
import { echoIsRevealed } from '@/lib/echo';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userId');

    // Validate input - must be present and a non-empty string after trim
    if (!userEmail || typeof userEmail !== 'string') {
      return NextResponse.json({ error: 'userId (email) required' }, { status: 400 });
    }

    const email = userEmail.trim();
    if (email === '') {
      return NextResponse.json({ error: 'userId (email) required' }, { status: 400 });
    }

    // Find user by email - handle potential Prisma errors
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email },
      });
    } catch (prismaError) {
      console.error('Prisma error in findUser (GET):', prismaError);
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (!user) {
      // User not found - return empty list, not error
      return NextResponse.json({ readings: [] });
    }

    // Get user's readings (avec l'écho scellé éventuel → badge horloge)
    try {
      const userReadings = await prisma.reading.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: { echo: { select: { id: true, dueAt: true, verdict: true, verdictPct: true, bestCardIndex: true, textFr: true, textEn: true, textEs: true, textHi: true } } },
      });

        // ── Hexagrammes du Jour : l'historique stocke (numero,mutating,transformed).
        // Pour les afficher comme la page du tirage (nom, idéogramme, pinyin, lignes,
        // conseil IA du jour), on rattache le texte des hexagrammes concernés — tables
        // soeurs comprises — en une seule requête.
        const duJour = userReadings.filter((r: any) => r.type === 'yi-jing-du-jour');
        const hexNums = new Set<number>();
        duJour.forEach((r: any) => {
          try {
            const c = JSON.parse(String(r.cards));
            if (Number.isFinite(c.numero)) hexNums.add(c.numero);
            if (Number.isFinite(c.transformed)) hexNums.add(c.transformed);
          } catch { /* carte illisible : affichage nudge plus bas */ }
        });
        const [hexRows, hexEn, hexEs, hexHi] = await Promise.all([
          prisma.hexagram.findMany({ where: { numero: { in: [...hexNums] } } }),
          prisma.hexagramEn.findMany({ where: { numero: { in: [...hexNums] } } }),
          prisma.hexagramEs.findMany({ where: { numero: { in: [...hexNums] } } }),
          prisma.hexagramHi.findMany({ where: { numero: { in: [...hexNums] } } }),
        ]);
        type HexCard = { numero: number; caractere: string; pinyin: string; name: string; synthese: string; lignes: string; nameBy: Record<string, string | null> };
        const hexMap = new Map<number, HexCard>(hexRows.map((h) => [
          h.numero,
          { numero: h.numero, caractere: h.caractere, pinyin: h.pinyin, name: h.element ?? '', synthese: h.synthese ?? '', lignes: (JSON.parse(h.lignes || '[]') as string[]).map((g) => (g.trim().includes(' ') ? '0' : '1')).reverse().join(''), nameBy: {} },
        ]));
        hexEn.forEach((e) => { const c = hexMap.get(e.numero); if (c) c.nameBy.en = e.nameEn ?? null; });
        hexEs.forEach((e) => { const c = hexMap.get(e.numero); if (c) c.nameBy.es = e.nameEs ?? null; });
        hexHi.forEach((e) => { const c = hexMap.get(e.numero); if (c) c.nameBy.hi = e.nameHi ?? null; });

      // Format response safely
      const readings = userReadings.map((r: any) => {
        let cards = Array.isArray(r.cards) ? r.cards : (typeof r.cards === 'string' ? JSON.parse(r.cards || '[]') : []);
        let interpretation = typeof r.interpretation === 'string' ? r.interpretation : (r.interpretation ? JSON.stringify(r.interpretation) : null);
        // Roue hebdo : jamais révéler l'avenir ni le fil rouge avant l'heure —
        // ni par l'interprétation, ni par la colonne `cards` (vignettes).
        // Hexagramme du Jour : la colonne cards = {numero,mutating,transformed}.
        // On la transforme en cartes lisibles (nom, idéogramme, pinyin, lignes 0/1,
        // mutantes, conseil IA du jour) — la vue de l'historique rend le même
        // déploiement magnifique que la page du tirage.
        if (r.type === 'yi-jing-du-jour') {
          try {
            const d = typeof cards === 'string' ? JSON.parse(cards) : cards;
            const mutating = Array.isArray((d as any).mutating) ? (d as any).mutating : [];
            const present = hexMap.get(Number((d as any).numero));
            if (present) {
              const transformed = Number.isFinite((d as any).transformed) ? hexMap.get((d as any).transformed) : null;
              let advice = '';
              try { advice = String(JSON.parse(interpretation || '{}').advice || ''); } catch { advice = ''; }
              cards = [
                { numero: present.numero, caractere: present.caractere, pinyin: present.pinyin, name: present.name, nameBy: present.nameBy, lignes: present.lignes, mutating, transformed: transformed?.numero ?? null },
                ...(transformed ? [{ numero: transformed.numero, caractere: transformed.caractere, pinyin: transformed.pinyin, name: transformed.name, nameBy: transformed.nameBy, lignes: transformed.lignes, transforming: true }] : []),
              ];
              if (advice) interpretation = JSON.stringify({ meditation: advice });
            }
          } catch { /* carte illisible : la vue affichera sobrement '—' */ }
        }
        if (r.type === 'tarot-semaine') {
          interpretation = sanitizeWheelInterpretation(interpretation, !!r.echo);
          try {
            const st = JSON.parse(interpretation || '{}');
            const rev = new Set<number>(st.revealed || []);
            cards = (st.cards || []).map((id: number, d: number) =>
              rev.has(d) && id >= 0 ? { id, name: TAROT_CARDS[id]?.name } : { id: -1 });
          } catch { /* état illisible : rester sur la colonne brute */ }
        }
        return {
          id: String(r.id ?? ''),
          type: r.type ?? null,
          question: r.question ?? null,
          spread: r.spread ?? null,
          cards,
          interpretation,
          createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
          // Le texte d'un augure scellé ne sort JAMAIS avant l'échéance/verdict
          // (règle du sceau, voir lib/echo.ts echoIsRevealed).
          echo: r.echo ? (() => { const rev = echoIsRevealed(r.echo.dueAt, r.echo.verdict); return { id: r.echo.id, dueAt: r.echo.dueAt.toISOString(), verdict: r.echo.verdict, verdictPct: r.echo.verdictPct ?? null, bestCardIndex: r.echo.bestCardIndex ?? null, textFr: rev ? (r.echo.textFr ?? null) : null, textEn: rev ? (r.echo.textEn ?? null) : null, textEs: rev ? (r.echo.textEs ?? null) : null, textHi: rev ? (r.echo.textHi ?? null) : null }; })() : null,
        };
      });

      return NextResponse.json({ readings });
    } catch (readError) {
      console.error('Error fetching readings:', readError);
      return NextResponse.json({ error: 'Failed to retrieve readings' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in /api/readings GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Parse request body safely
    let reqBody;
    try {
      reqBody = await request.json();
    } catch (parseError) {
      console.error('Invalid JSON in request body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { userId, type, question, spread, cards, interpretation } = reqBody;

    // Validate userId - must be present and a non-empty string after trim
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId (email) required' }, { status: 400 });
    }

    const email = userId.trim();
    if (email === '') {
      return NextResponse.json({ error: 'userId (email) required' }, { status: 400 });
    }

    // Find user by email - handle potential Prisma errors
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email },
      });
    } catch (prismaError) {
      console.error('Prisma error in findUser (POST):', prismaError);
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prepare data for creation with safe defaults
    const data: any = {
      userId: user.id,
      type: type !== undefined && type !== null ? String(type) : null,
      question: question !== undefined && question !== null ? String(question) : null,
      spread: spread !== undefined && spread !== null ? String(spread) : null,
      // Ensure cards is a string (JSON) or empty array
      cards: Array.isArray(cards)
        ? JSON.stringify(cards)
        : typeof cards === 'string'
          ? cards.trim() === '' || cards === '[]'
            ? '[]'
            : cards
          : '[]',
      // Ensure interpretation is a string (JSON) or empty object
      interpretation: typeof interpretation === 'string' && interpretation.trim() !== '' && interpretation !== '{}'
        ? interpretation
        : '{}',
    };

    // Validate that cards is valid JSON array if it's a string
    let cardsArray: any[] = [];
    try {
      if (typeof data.cards === 'string') {
        const parsed = JSON.parse(data.cards);
        cardsArray = Array.isArray(parsed) ? parsed : [];
        // Re-stringify to ensure consistent format
        data.cards = JSON.stringify(cardsArray);
      } else if (Array.isArray(data.cards)) {
        data.cards = JSON.stringify(data.cards);
      } else {
        data.cards = '[]';
      }
    } catch (cardsError) {
      console.error('Invalid cards format:', cardsError);
      data.cards = '[]';
    }

    // If interpretation is a plain text string, store it directly
    // (it's NOT required to be JSON — static text, LLM responses, etc.)
    if (typeof data.interpretation === 'string' && data.interpretation.trim() !== '') {
      // keep as-is: plain text or JSON string
    } else if (typeof data.interpretation === 'object' && data.interpretation !== null && !Array.isArray(data.interpretation)) {
      data.interpretation = JSON.stringify(data.interpretation);
    } else {
      data.interpretation = null;
    }

    // Create the reading record
    try {
      const created = await prisma.reading.create({
        data,
      });
      return NextResponse.json({ success: true, id: created.id });
    } catch (createError) {
      console.error('Error creating reading:', createError);
      return NextResponse.json({ error: 'Failed to save reading' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in /api/readings POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// --- PUT : met à jour les champs cards / interpretation d'une lecture existante ---
export async function PUT(request: Request) {
  try {
    let reqBody;
    try {
      reqBody = await request.json();
    } catch (parseError) {
      console.error('Invalid JSON in PUT body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { userId, id, cards, interpretation, spread } = reqBody;

    if (!userId || typeof userId !== 'string') return NextResponse.json({ error: 'userId required' }, { status: 400 });
    if (!id) return NextResponse.json({ error: 'reading id required' }, { status: 400 });
    const email = userId.trim();
    if (email === '') return NextResponse.json({ error: 'userId required' }, { status: 400 });

    let user;
    try { user = await prisma.user.findUnique({ where: { email } }); } catch { return NextResponse.json({ error: 'Invalid user' }, { status: 400 }); }
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Vérifier que la lecture appartient bien à cet utilisateur
    const existing = await prisma.reading.findUnique({ where: { id: String(id) } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Reading not found or not owned' }, { status: 404 });
    }

    const updateData: any = {};
    if (cards !== undefined) {
      updateData.cards = Array.isArray(cards) ? JSON.stringify(cards) : (typeof cards === 'string' ? cards : '[]');
    }
    if (interpretation !== undefined) {
      updateData.interpretation = typeof interpretation === 'string' && interpretation.trim() !== '' ? interpretation : existing.interpretation;
    }
    if (spread !== undefined) {
      updateData.spread = typeof spread === 'string' && spread.trim() !== '' ? spread : existing.spread;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    try {
      await prisma.reading.update({ where: { id: String(id) }, data: updateData });
      return NextResponse.json({ success: true });
    } catch (updateError) {
      console.error('Error updating reading:', updateError);
      return NextResponse.json({ error: 'Failed to update reading' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in /api/readings PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    let reqBody;
    try {
      reqBody = await request.json();
    } catch (parseError) {
      console.error('Invalid JSON in DELETE body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { userId, id, date } = reqBody;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId (email) required' }, { status: 400 });
    }
    const email = userId.trim();
    if (email === '') {
      return NextResponse.json({ error: 'userId (email) required' }, { status: 400 });
    }
    if (!id && !date) {
      return NextResponse.json({ error: 'id or date required' }, { status: 400 });
    }

    // Résoudre l'utilisateur (vérif ownership : on scope toujours au user)
    let user;
    try {
      user = await prisma.user.findUnique({ where: { email } });
    } catch (prismaError) {
      console.error('Prisma error in findUser (DELETE):', prismaError);
      return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
    }
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const where: any = { userId: user.id };

    if (id) {
      where.id = String(id);
    } else if (date) {
      // date au format YYYY-MM-DD -> borner la journée UTC
      const day = String(date).slice(0, 10);
      const start = new Date(`${day}T00:00:00.000Z`);
      const end = new Date(`${day}T23:59:59.999Z`);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json({ error: 'Invalid date format (attendu YYYY-MM-DD)' }, { status: 400 });
      }
      where.createdAt = { gte: start, lte: end };
    }

    try {
      const result = await prisma.reading.deleteMany({ where });
      return NextResponse.json({ success: true, deleted: result.count });
    } catch (delError) {
      console.error('Error deleting readings:', delError);
      return NextResponse.json({ error: 'Failed to delete readings' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in /api/readings DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
