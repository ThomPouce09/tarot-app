import nodemailer from 'nodemailer';

// Transporteur SMTP partagé (config identique à forgot-password).
// Utilisé par : lettre mystique (letter-send + cron/letters),
// emails d'activation (signup + resend-confirmation), mot de passe oublié.
//
// Fournisseur : variable selon l'environnement (Vercel → Secrets) :
//   Brevo  : SMTP_HOST=smtp-relay.brevo.com  SMTP_PORT=587
//            SMTP_LOGIN=<email compte>       SMTP_KEY=<clé SMTP>
//   Gmail  : SMTP_HOST=smtp.gmail.com        GMAIL_USER / GMAIL_PASS (repli)
// Si rien n'est défini, on NE casse pas le build : l'envoi échoue au moment
// de l'envoi avec un log explicite (au lieu d'un « Missing credentials »
// silencieux chez le client).
// ── Fournisseur résolu par PAIRE de credentials, JAMAIS par l'hôte seul ──
// Brevo : SMTP_LOGIN+SMTP_KEY tous deux présents → relais Brevo (SMTP_HOST
//         optionnel, défaut smtp-relay.brevo.com).
// Gmail : sinon, GMAIL_USER+GMAIL_PASS → smtp.gmail.com IMPOSÉ. Une paire
//         Gmail ne doit jamais partir vers un hôte Brevo resté dans .env
//         (cause vécue du « 535 5.7.8 » : host=brevo + identifiants Gmail).
const hasBrevo = Boolean(process.env.SMTP_LOGIN?.trim() && process.env.SMTP_KEY?.trim());
const hasGmail = Boolean(process.env.GMAIL_USER?.trim() && process.env.GMAIL_PASS?.trim());
export const SMTP_PROVIDER: 'brevo' | 'gmail' | 'none' = hasBrevo ? 'brevo' : hasGmail ? 'gmail' : 'none';

let SMTP_USER = '';
let SMTP_PASS = '';
let SMTP_HOST = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
if (SMTP_PROVIDER === 'brevo') {
  SMTP_USER = (process.env.SMTP_LOGIN as string).trim();
  SMTP_PASS = (process.env.SMTP_KEY as string).trim();
  SMTP_HOST = process.env.SMTP_HOST?.trim() || 'smtp-relay.brevo.com';
} else if (SMTP_PROVIDER === 'gmail') {
  SMTP_USER = (process.env.GMAIL_USER as string).trim();
  // Mot de passe d'application Gmail : affiché avec espaces par Google, attendu
  // SANS espaces par le serveur → on normalise (sinon 535 5.7.8).
  SMTP_PASS = (process.env.GMAIL_PASS as string).replace(/\s+/g, '');
  SMTP_HOST = 'smtp.gmail.com';
} else {
  console.warn('[mailer] aucune paire complète (SMTP_LOGIN+SMTP_KEY ou GMAIL_USER+GMAIL_PASS) : les envois échoueront.');
}
export const mailer = nodemailer.createTransport({
  host: SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

// Expéditeur : MAIL_FROM (adresse vérifiée chez le fournisseur) > login SMTP.
export const MAIL_FROM = process.env.MAIL_FROM?.trim() || SMTP_USER;

// URL de base absolue pour les liens d'email (priorité : NEXT_PUBLIC_APP_URL,
// puis APP_URL, puis localhost). Sans quoi un lien est cassé ("undefined/...").
// ⚠️ Le slash FINAL est TOUJOURS retiré : NEXT_PUBLIC_APP_URL est souvent saisie
// avec un « / » de fin (Vercel) → sans ça on génère « …app//auth/confirm », lien
// mort sur App Links / clients mail stricts.
export function appBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
  return raw.trim().replace(/\/+$/, '');
}
const BASE_URL = appBaseUrl();

// Envoi de l'email d'activation (utilisée par : signup + resend-confirmation).
// Factorisée ici pour ne pas dupliquer le gabarit d'email.
export async function sendConfirmationEmail({
  email,
  firstName,
  token,
}: {
  email: string;
  firstName?: string | null;
  token: string;
}) {
  // Deep-link natif : sous Android installé, le lien ouvre l'APK (intent
  // tarotdivination:// → routeAppUrl → /auth/confirm interne : pas de passage
  // par le navigateur Vercel, pas de re-login, pas de modale de langue).
  // Les clients mail sans handler natif retombent sur l'URL web équivalente.
  const confirmPath = `/auth/confirm?token=${token}&mode=activate`;
  const confirmWeb = `${BASE_URL}${confirmPath}`;
  const confirmUrl = `tarotdivination://open?url=${encodeURIComponent(confirmPath)}`;
  const salutation = firstName ? ` Bonjour ${firstName},` : ' Bonjour,';
  await mailer.sendMail({
    from: MAIL_FROM,
    to: email,
    subject: 'Activation de votre compte Tarot Divinatoire',
    text:
      `${salutation}\n\n` +
      `Pour activer votre compte et accéder aux univers, cliquez sur ce lien :\n` +
      `${confirmUrl}\n\n` +
      `Si le bouton ne fonctionne pas (app non installée), copiez-collez ce lien web :
` +
      `${confirmWeb}`,
    html:
      `<div style="font-family:sans-serif;line-height:1.5;color:#2a1700">` +
      `<p>${firstName ? 'Bonjour <strong>' + firstName + '</strong>,' : 'Bonjour,'}</p>` +
      `<p>Pour <strong>activer votre compte</strong> et accéder aux univers, cliquez sur le lien ci-dessous :</p>` +
      `<p><a href="${confirmUrl}" style="display:inline-block;padding:10px 18px;background:#DAA520;color:#1a0e0a;text-decoration:none;border-radius:6px;font-weight:600">Activer mon compte</a></p>` +
      `<p style="opacity:.7">Si le bouton ne s'ouvre pas dans l'application, utilisez ce lien web : ` +
      `<a href="${confirmWeb}" style="color:#DAA520">${confirmWeb}</a></p>` +
      `</div>`,
  });
}
