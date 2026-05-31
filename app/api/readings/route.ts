export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

// Check if database is available
function isDbAvailable(): boolean {
  return process.env.DISABLE_DB !== 'true' && process.env.DATABASE_URL ? true : false;
}

// In-memory store for readings (fallback when DB is disabled)
let inMemoryReadings: Array<{
  id: string;
  card1: string;
  card2: string;
  card3: string;
  card1Rev: boolean;
  card2Rev: boolean;
  card3Rev: boolean;
  interpretation?: string | null;
  createdAt: string;
  updatedAt: string;
}> = [];

export async function POST(req: Request) {
  try {
    const body = await req?.json?.();
    const { card1, card2, card3, card1Rev, card2Rev, card3Rev } = body ?? {};

    if (!card1 || !card2 || !card3) {
      return NextResponse.json({ error: 'Missing card data' }, { status: 400 });
    }

    // If DB is disabled, use in-memory storage
    if (!isDbAvailable()) {
      const reading = {
        id: `reading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        card1: String(card1),
        card2: String(card2),
        card3: String(card3),
        card1Rev: Boolean(card1Rev),
        card2Rev: Boolean(card2Rev),
        card3Rev: Boolean(card3Rev),
        interpretation: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      inMemoryReadings.unshift(reading);
      // Keep only last 50 readings in memory
      if (inMemoryReadings.length > 50) {
        inMemoryReadings = inMemoryReadings.slice(0, 50);
      }
      return NextResponse.json({ success: true, id: reading.id, mode: 'memory' });
    }

    // Use database if available
    try {
      const { prisma } = await import('@/lib/prisma');
      const reading = await prisma.reading.create({
        data: {
          card1: String(card1),
          card2: String(card2),
          card3: String(card3),
          card1Rev: Boolean(card1Rev),
          card2Rev: Boolean(card2Rev),
          card3Rev: Boolean(card3Rev),
        },
      });
      return NextResponse.json({ success: true, id: reading?.id ?? '', mode: 'database' });
    } catch (dbError: any) {
      console.warn('Database unavailable, falling back to in-memory storage:', dbError.message);
      // Fallback to in-memory
      const reading = {
        id: `reading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        card1: String(card1),
        card2: String(card2),
        card3: String(card3),
        card1Rev: Boolean(card1Rev),
        card2Rev: Boolean(card2Rev),
        card3Rev: Boolean(card3Rev),
        interpretation: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      inMemoryReadings.unshift(reading);
      if (inMemoryReadings.length > 50) {
        inMemoryReadings = inMemoryReadings.slice(0, 50);
      }
      return NextResponse.json({ success: true, id: reading.id, mode: 'memory' });
    }
  } catch (error: any) {
    console.error('Error saving reading:', error);
    return NextResponse.json(
      { error: 'Failed to save reading' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // If DB is disabled, return in-memory readings
    if (!isDbAvailable()) {
      return NextResponse.json(inMemoryReadings.slice(0, 10));
    }

    // Use database if available
    try {
      const { prisma } = await import('@/lib/prisma');
      const readings = await prisma.reading.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      return NextResponse.json(readings ?? []);
    } catch (dbError: any) {
      console.warn('Database unavailable, returning in-memory readings:', dbError.message);
      return NextResponse.json(inMemoryReadings.slice(0, 10));
    }
  } catch (error: any) {
    console.error('Error fetching readings:', error);
    return NextResponse.json(inMemoryReadings.slice(0, 10), { status: 200 });
  }
}
