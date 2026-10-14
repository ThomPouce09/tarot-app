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
const SMTP_USER = process.env.SMTP_LOGIN || process.env.GMAIL_USER || '';
const SMTP_PASS = process.env.SMTP_KEY || process.env.GMAIL_PASS || '';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
if (!SMTP_USER || !SMTP_PASS) {
  console.warn('[mailer] identifiants SMTP absents (SMTP_LOGIN/SMTP_KEY ou GMAIL_USER/GMAIL_PASS) : les envois échoueront.');
}
export const mailer = nodemailer.createTransport({
  host: SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

// Expéditeur : MAIL_FROM (adresse vérifiée chez le fournisseur) > login SMTP.
export const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER;

// URL de base absolue pour les liens d'email (priorité : NEXT_PUBLIC_APP_URL,
// puis APP_URL, puis localhost). Sans quoi un lien est cassé ("undefined/...").
const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';

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
  const confirmUrl = `${BASE_URL}/auth/confirm?token=${token}&mode=activate`;
  const salutation = firstName ? ` Bonjour ${firstName},` : ' Bonjour,';
  await mailer.sendMail({
    from: MAIL_FROM,
    to: email,
    subject: 'Activation de votre compte Tarot Divinatoire',
    text:
      `${salutation}\n\n` +
      `Pour activer votre compte et accéder aux univers, cliquez sur ce lien :\n` +
      `${confirmUrl}\n\n` +
      `Si le lien ne fonctionne pas, copiez-collez-le dans votre navigateur.`,
    html:
      `<div style="font-family:sans-serif;line-height:1.5;color:#2a1700">` +
      `<p>${firstName ? 'Bonjour <strong>' + firstName + '</strong>,' : 'Bonjour,'}</p>` +
      `<p>Pour <strong>activer votre compte</strong> et accéder aux univers, cliquez sur le lien ci-dessous :</p>` +
      `<p><a href="${confirmUrl}" style="display:inline-block;padding:10px 18px;background:#DAA520;color:#1a0e0a;text-decoration:none;border-radius:6px;font-weight:600">Activer mon compte</a></p>` +
      `<p style="opacity:.7">Si le bouton ne fonctionne pas, copiez-collez : ${confirmUrl}</p>` +
      `</div>`,
  });
}
