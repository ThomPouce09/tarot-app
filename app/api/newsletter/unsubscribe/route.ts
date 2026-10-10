import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { letterBaseUrl } from '@/lib/letter-links';

export const dynamic = 'force-dynamic';

// Désabonnement en un clic depuis la lettre hebdomadaire (exigence RGPD).
// Aucune connexion requise : le lien porte l'adresse du destinataire.
// GET (clic depuis un client mail) ET POST (RFC 8058, si un client l'envoie).
export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  const email = (request.nextUrl.searchParams.get('email') || '').trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'email requis' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.user.update({ where: { email }, data: { emailNews: false } });
  }
  // Page de confirmation minimale (le lien s'ouvre dans un navigateur).
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lettre mystique — désabonnement</title></head>
<body style="margin:0;background:#0a0510;color:#e8dcc8;font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;">
<div style="padding:32px;max-width:460px;">
<div style="font-size:40px;">&#10022;</div>
<h1 style="font-size:20px;color:#F0C75E;margin:14px 0 10px;">Vous ne recevrez plus la lettre mystique</h1>
<p style="color:#b3a68c;font-size:14px;line-height:1.6;">Votre compte reste actif et vos augures vous attendent. Vous pouvez réactiver la lettre quand vous voulez depuis vos préférences.</p>
<p style="margin-top:18px;"><a href="${letterBaseUrl()}/dashboard/account/preferences" style="color:#DAA520;">Retour à mes préférences</a></p>
</div></body></html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
