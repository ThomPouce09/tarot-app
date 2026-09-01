import nodemailer from 'nodemailer';

// Transporteur SMTP partagé (config identique à forgot-password).
// Utilisé par : lettre mystique (letter-send + cron/letters).
export const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export const MAIL_FROM = process.env.GMAIL_USER;

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
