import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Create a generic transporter (configure in .env)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
    }

    const resetToken = randomBytes(32).toString('hex');
    
    await prisma.user.update({
      where: { email },
      data: { confirmationToken: resetToken },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'}/auth/confirm?token=${resetToken}`;

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Réinitialisation du mot de passe',
      html: `<p>Cliquez <a href="${resetUrl}">ici</a> pour réinitialiser votre mot de passe.</p>`,
    });

    return NextResponse.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
  } catch (error) { console.error("Forgot password error:", error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
