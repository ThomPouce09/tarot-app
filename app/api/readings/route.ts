import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Get user's readings
    try {
      const userReadings = await prisma.reading.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      // Format response safely
      const readings = userReadings.map((r: any) => ({
        id: String(r.id ?? ''),
        type: r.type ?? null,
        question: r.question ?? null,
        spread: r.spread ?? null,
        cards: Array.isArray(r.cards) ? r.cards : (typeof r.cards === 'string' ? JSON.parse(r.cards || '[]') : []),
        interpretation: typeof r.interpretation === 'string' ? r.interpretation : (r.interpretation ? JSON.stringify(r.interpretation) : null),
        createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      }));

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
