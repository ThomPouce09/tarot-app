import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, gender, age, phone, comment } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json({ error: 'Cet email est déjà inscrit. Connectez-vous ou utilisez un autre email.' }, { status: 400 });
    }

    const hashedPassword = await (bcrypt as any).hash(password, 12);
    const confirmationToken = randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        gender,
        age: age ? parseInt(age) : null,
        phone,
        comment,
        confirmationToken,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        gender: user.gender,
        age: user.age,
        phone: user.phone,
        comment: user.comment,
        confirmed: user.confirmed,
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Erreur serveur: ' + error.message }, { status: 500 });
  }
}
