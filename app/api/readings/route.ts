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

    // Validate that interpretation is valid JSON object if it's a string
    try {
      if (typeof data.interpretation === 'string') {
        const parsed = JSON.parse(data.interpretation);
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
          // Valid object, re-stringify for consistency
          data.interpretation = JSON.stringify(parsed);
        } else {
          data.interpretation = '{}';
        }
      } else if (typeof data.interpretation === 'object' && data.interpretation !== null && !Array.isArray(data.interpretation)) {
        data.interpretation = JSON.stringify(data.interpretation);
      } else {
        data.interpretation = '{}';
      }
    } catch (interpError) {
      console.error('Invalid interpretation format:', interpError);
      data.interpretation = '{}';
    }

    // Create the reading record
    try {
      await prisma.reading.create({
        data,
      });
      return NextResponse.json({ success: true });
    } catch (createError) {
      console.error('Error creating reading:', createError);
      return NextResponse.json({ error: 'Failed to save reading' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in /api/readings POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}