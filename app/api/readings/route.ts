export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';

// In-memory store for readings (fallback when DB is disabled)
let inMemoryReadings: Array<{
  id: number;
  question?: string | null;
  spread: string;
  cards: any[];
  interpretation?: string | null;
  createdAt: string;
} | null> = [];

export async function POST(req: Request) {
  try {
    const body = await req?.json?.();
    const { question, spread, cards, interpretation } = body ?? {};

    if (!spread || !cards || !Array.isArray(cards)) {
      return NextResponse.json({ error: 'Missing spread or cards data' }, { status: 400 });
    }

    // If DB is disabled, use in-memory storage
    if (!process.env.DATABASE_URL) {
      const reading = {
        id: Date.now(),
        question: question ? String(question) : null,
        spread: String(spread),
        cards: cards,
        interpretation: interpretation ? String(interpretation) : null,
        createdAt: new Date().toISOString(),
      };
      inMemoryReadings.unshift(reading);
      // Keep only last 50 readings in memory
      if (inMemoryReadings.length > 50) {
        inMemoryReadings = inMemoryReadings.slice(0, 50);
      }
      return NextResponse.json({ success: true, id: reading.id, mode: 'memory' });
    }

    // Use database
    try {
      const { db, readings } = await import('../../../lib/db');
      const [newReading] = await db.insert(readings).values({
        question: question ? String(question) : null,
        spread: String(spread),
        cards: cards,
        interpretation: interpretation ? String(interpretation) : null,
      }).returning();

      return NextResponse.json({ 
        success: true, 
        id: newReading.id, 
        mode: 'database' 
      });
    } catch (dbError: any) {
      console.warn('Database unavailable, falling back to in-memory storage:', dbError.message);
      // Fallback to in-memory
      const reading = {
        id: Date.now(),
        question: question ? String(question) : null,
        spread: String(spread),
        cards: cards,
        interpretation: interpretation ? String(interpretation) : null,
        createdAt: new Date().toISOString(),
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
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(inMemoryReadings.slice(0, 10));
    }

    // Use database
    try {
      const { db, readings } = await import('../../../lib/db');
      const allReadings = await db.query.readings.findMany({
        orderBy: [desc(readings.createdAt)],
        limit: 10,
      });
      return NextResponse.json(allReadings ?? []);
    } catch (dbError: any) {
      console.warn('Database unavailable, returning in-memory readings:', dbError.message);
      return NextResponse.json(inMemoryReadings.slice(0, 10));
    }
  } catch (error: any) {
    console.error('Error fetching readings:', error);
    return NextResponse.json(inMemoryReadings.slice(0, 10), { status: 200 });
  }
}