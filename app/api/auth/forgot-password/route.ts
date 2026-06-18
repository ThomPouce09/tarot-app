import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

const DB_FILE = join(process.cwd(), '.registered-emails.json');

const hashEmailForLookup = (email: string): string => {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email } = body;

  if (!email) {
    return NextResponse.json({ error: 'Email requis' }, { status: 400 });
  }

  // Vérifier si l'utilisateur existe
  const emailStore = existsSync(DB_FILE) 
    ? new Map(JSON.parse(readFileSync(DB_FILE, 'utf-8'))) 
    : new Map();

  const emailKey = hashEmailForLookup(email);

  if (!emailStore.has(emailKey)) {
    // Ne pas révéler si l'email existe ou non (sécurité)
    return NextResponse.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
  }

  // Générer un token de réinitialisation
  const resetToken = randomBytes(32).toString('hex');
  const userData = emailStore.get(emailKey);
  
  (userData as any).resetToken = resetToken;
  (userData as any).resetExpires = Date.now() + 3600000; // 1 heure

  try {
    writeFileSync(DB_FILE, JSON.stringify(Array.from(emailStore.entries()), null, 2));
  } catch {}

  // Envoyer l'email (mode dev: log console)
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/auth/reset-password?token=${resetToken}`;
  console.log('RESET PASSWORD LINK:', resetUrl);

  return NextResponse.json({ message: 'Email de réinitialisation envoyé !' });
}
