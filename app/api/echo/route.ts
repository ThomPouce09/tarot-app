// app/api/echo/route.ts
// Échos : POST = sceller (IA + gating Initié/Arkane), GET = liste d'un compte,
// PUT = verdict de vérification (oui | partiel | non).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  generateAndSaveEcho,
  serializeEcho,
  ECHO_DOMAINS,
  type EchoDomain,
} from '@/lib/echo';

export const dynamic = 'force-dynamic';

const VALID_VERDICTS = ['oui', 'partiel', 'non'] as const;

async function findUser(email: string) {
  return prisma.user.findUnique({
    where: { email: String(email || '').trim().toLowerCase() },
    select: { id: true },
  });
}

export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = String(body.userId || '').trim();
  const domain = body.domain as EchoDomain;
  if (!email) return NextResponse.json({ error: 'userId requis' }, { status: 400 });
  if (!ECHO_DOMAINS.includes(domain)) {
    return NextResponse.json({ error: 'domain invalide' }, { status: 400 });
  }
  const summary = String(body.summary || '').trim();
  if (summary.length < 20) {
    return NextResponse.json({ error: 'summary trop court' }, { status: 400 });
  }

  // Anti-doublon : un écho existe déjà pour cette lecture → on le renvoie.
  const readingId = body.readingId ? String(body.readingId) : null;
  if (readingId) {
    const existing = await prisma.echo.findUnique({ where: { readingId } });
    if (existing) return NextResponse.json({ echo: serializeEcho(existing) });
  }

  const result = await generateAndSaveEcho({
    email,
    readingId,
    domain,
    question: body.question ? String(body.question) : null,
    summary: summary.slice(0, 1200),
  });

  if (result.echo) return NextResponse.json({ echo: result.echo });
  const err = result.error as { reason?: string; message?: string };
  return NextResponse.json({ error: err.message || 'Écho impossible', reason: err.reason }, { status: err.reason === 'tier' || err.reason === 'cap' ? 403 : 502 });
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('userId') || '';
  const user = await findUser(email);
  if (!user) return NextResponse.json({ error: 'user introuvable' }, { status: 404 });

  const echoes = await prisma.echo.findMany({
    where: { userId: user.id },
    orderBy: { dueAt: 'asc' },
  });
  return NextResponse.json({ echoes: echoes.map(serializeEcho) });
}

export async function PUT(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = String(body.userId || '').trim();
  const echoId = String(body.echoId || '').trim();
  const verdict = String(body.verdict || '').trim();
  if (!email || !echoId) return NextResponse.json({ error: 'userId et echoId requis' }, { status: 400 });
  if (!VALID_VERDICTS.includes(verdict as (typeof VALID_VERDICTS)[number])) {
    return NextResponse.json({ error: 'verdict invalide' }, { status: 400 });
  }

  const user = await findUser(email);
  if (!user) return NextResponse.json({ error: 'user introuvable' }, { status: 404 });

  const existing = await prisma.echo.findFirst({ where: { id: echoId, userId: user.id } });
  if (!existing) return NextResponse.json({ error: 'écho introuvable' }, { status: 404 });

  const updated = await prisma.echo.update({
    where: { id: echoId },
    data: { verdict, verdictAt: new Date() },
  });
  return NextResponse.json({ echo: serializeEcho(updated) });
}
