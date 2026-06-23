import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userEmail = searchParams.get('userId');

  if (!userEmail) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  // Trouver l'utilisateur par email pour obtenir l'id
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    return NextResponse.json({ readings: [] });
  }

  const userReadings = await prisma.reading.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });
  
  const readings = userReadings.map((r: any) => ({
    id: r.id,
    type: r.type,
    question: r.question,
    spread: r.spread,
    cards: JSON.parse(r.cards),
    interpretation: r.interpretation,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ readings });
}

export async function POST(request: Request) {
  const { userId, type, question, spread, cards, interpretation } = await request.json();

  // Convertir email en id utilisateur
  const user = await prisma.user.findUnique({
    where: { email: userId },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const reading = await prisma.reading.create({
    data: {
      userId: user.id,
      type,
      question,
      spread,
      cards: JSON.stringify(cards),
      interpretation: interpretation || null,
    },
  });

  return NextResponse.json({ success: true, reading });
}
