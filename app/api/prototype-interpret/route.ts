import { NextRequest, NextResponse } from 'next/server';
import { callOracle } from '@/lib/llm';

// Route de test — prototypes de tirages (non référencée). Accepte un prompt
// libre, renvoie la réponse brute de l'oracle. Aucune persistance, aucun gate.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { prompt?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const prompt = String(body.prompt || '').trim();
  if (!prompt) return NextResponse.json({ error: 'prompt requis' }, { status: 400 });
  const text = await callOracle(prompt, { timeoutMs: 60_000, maxTokens: 1200 });
  if (!text) return NextResponse.json({ error: 'oracle muet' }, { status: 502 });
  return NextResponse.json({ text: text.trim() });
}
