import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory store for readings (works without database)
let inMemoryReadings: Array<{
  id: number;
  question?: string | null;
  spread: string;
  cards: any[];
  interpretation?: string | null;
  createdAt: string;
  user_id?: string | null;
  type?: string | null;
}> = [];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, spread, cards, interpretation, user_id, type } = body ?? {};

    if (!spread || !cards || !Array.isArray(cards)) {
      return NextResponse.json({ error: 'Missing spread or cards data' }, { status: 400 });
    }

    const reading = {
      id: Date.now(),
      question: question ? String(question) : null,
      spread: String(spread),
      cards: cards,
      interpretation: interpretation ? String(interpretation) : null,
      createdAt: new Date().toISOString(),
      user_id: user_id || null,
      type: type || 'tarot',
    };
    
    inMemoryReadings.unshift(reading);
    if (inMemoryReadings.length > 100) {
      inMemoryReadings = inMemoryReadings.slice(0, 100);
    }

    return NextResponse.json({ success: true, id: reading.id });
  } catch (error: any) {
    console.error('Readings POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const user_id = url.searchParams.get('user_id');
  
  if (user_id) {
    const userReadings = inMemoryReadings.filter(r => r.user_id === user_id);
    return NextResponse.json({ readings: userReadings });
  }
  
  return NextResponse.json({ readings: inMemoryReadings.slice(0, 50) });
}
