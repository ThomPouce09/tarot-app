import { NextRequest, NextResponse } from 'next/server';
import { appendFileSync } from 'fs';
import { join } from 'path';

export async function POST(req: NextRequest) {
  try {
    const { msg, ts } = await req.json();
    
    const logPath = join(process.cwd(), 'debug-interpretation.log');
    const timestamp = new Date(ts || Date.now()).toISOString();
    
    appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur debug-log:', error);
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
  }
}