// app/api/debug/smtp-status/route.ts
// DIAGNOSTIC SMTP (web + prod) : vérifier la chaîne d'envoi SANS exposer de secret.
//   GET ?secret=<CRON_SECRET>                    → verdict (fournisseur résolu,
//       variables présentes/absentes — jamais leurs valeurs) + verify() du transporteur
//   GET ?secret=<CRON_SECRET>&test=email@domaine → envoie un email de test réel
//       (test limité aux emails dont le domaine est dans SMTP_TEST_DOMAINS,
//        défaut : domaine de l'expéditeur — sinon refus)
// Utiliser cette route quand un utilisateur signale « Missing credentials for
// "PLAIN" » ou un échec d'envoi : le verdict dit immédiatement quelle variable
// manque dans CET environnement (le déploiement qui sert la requête).
// Aucune clé imprimée : uniquement des booléens présents/absents et le host.

import { NextRequest, NextResponse } from 'next/server';
import { mailer, MAIL_FROM } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

function bool(v?: string) { return Boolean(v && v.trim().length > 0); }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret') || '';
  const expected = process.env.CRON_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'secret requis (CRON_SECRET)' }, { status: 401 });
  }

  const env = {
    SMTP_HOST: process.env.SMTP_HOST || '(défaut smtp.gmail.com)',
    SMTP_PORT: process.env.SMTP_PORT || '(défaut 587)',
    SMTP_LOGIN_present: bool(process.env.SMTP_LOGIN),
    SMTP_KEY_present: bool(process.env.SMTP_KEY),
    GMAIL_USER_present: bool(process.env.GMAIL_USER),
    GMAIL_PASS_present: bool(process.env.GMAIL_PASS),
    MAIL_FROM_present: bool(process.env.MAIL_FROM),
    NODE_ENV: process.env.NODE_ENV,
  };
  const creds = (bool(process.env.SMTP_LOGIN) && bool(process.env.SMTP_KEY))
    || (bool(process.env.GMAIL_USER) && bool(process.env.GMAIL_PASS));
  const verdict = creds
    ? 'OK — identifiants présents : vérifier le verify() ci-dessous'
    : 'MANQUANT — aucune paire d’identifiants complète dans cet environnement : ajouter SMTP_LOGIN+SMTP_KEY (Brevo) ou GMAIL_USER+GMAIL_PASS (Gmail) dans Vercel → Settings → Environment Variables, scope Production, puis Redeploy';

  let smtp: any = { verify: 'skipped' };
  try {
    if (creds) {
      await mailer.verify();
      smtp = { verify: 'OK — le serveur SMTP accepte la connexion et l’authentification' };
    } else {
      smtp = { verify: 'impossible (pas d’identifiants)' };
    }
  } catch (e: any) {
    smtp = { verify: 'ÉCHEC', error: String(e?.message || e).slice(0, 200) };
  }

  // Email de test optionnel (domaine restreint pour ne pas être un relais ouvert).
  const testTo = (searchParams.get('test') || '').trim().toLowerCase();
  let send: any = undefined;
  if (testTo) {
    const fromDomain = (MAIL_FROM.split('@')[1] || '').toLowerCase();
    const allow = (process.env.SMTP_TEST_DOMAINS || fromDomain).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const atDomain = testTo.split('@')[1] || '';
    if (!allow.includes(atDomain)) {
      send = { skipped: true, reason: `domaine non autorisé (autorisés: ${allow.join(', ')})` };
    } else if (!creds) {
      send = { skipped: true, reason: 'pas d’identifiants' };
    } else {
      try {
        const info = await mailer.sendMail({
          from: MAIL_FROM,
          to: testTo,
          subject: '[debug] Test SMTP Oracle des Étoiles',
          text: 'Si vous recevez ce message, la chaîne SMTP est opérationnelle dans cet environnement.',
        });
        send = { sent: true, messageId: String(info.messageId || '').slice(0, 60) };
      } catch (e: any) {
        send = { sent: false, error: String(e?.message || e).slice(0, 200) };
      }
    }
  }

  return NextResponse.json({ verdict, env, smtp, send }, { status: 200 });
}
