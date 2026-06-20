import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

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
  }));

  return NextResponse.json({ readings });
}

export async function POST(request: Request) {
  const { userId, type, question, spread, cards } = await request.json();

  const reading = await prisma.reading.create({
    data: {
      userId,
      type,
      question,
      spread,
      cards: JSON.stringify(cards),
    },
  });

  return NextResponse.json({ success: true, reading });
}
