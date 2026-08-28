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
