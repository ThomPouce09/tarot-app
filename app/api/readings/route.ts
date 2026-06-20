import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, spread, cards, interpretation, userId, type } = body ?? {};

    if (!cards || !Array.isArray(cards)) {
      return NextResponse.json({ error: 'Missing cards data' }, { status: 400 });
    }

    const reading = await prisma.reading.create({
      data: {
        userId: userId || '',
        type: type || 'tarot',
        question: question ? String(question) : null,
        spread: spread ? String(spread) : null,
        cards: JSON.stringify(cards),
        interpretation: interpretation ? String(interpretation) : null,
      },
    });

    return NextResponse.json({ success: true, id: reading.id });
  } catch (error: any) {
    console.error('Readings POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (userId) {
      const userReadings = await prisma.reading.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      
      const readings = userReadings.map((r: any) => ({
        id: r.id,
        question: r.question,
        spread: r.spread,
        cards: JSON.parse(r.cards),
        interpretation: r.interpretation,
        createdAt: r.createdAt.toISOString(),
        userId: r.userId,
        type: r.type,
      }));
      
      return NextResponse.json({ readings });
    }

    const allReadings = await prisma.reading.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const readings = allReadings.map((r: any) => ({
      id: r.id,
      question: r.question,
      spread: r.spread,
      cards: JSON.parse(r.cards),
      interpretation: r.interpretation,
      createdAt: r.createdAt.toISOString(),
      userId: r.userId,
      type: r.type,
    }));

    return NextResponse.json({ readings });
  } catch (error: any) {
    console.error('Readings GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
