import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const hashPassword = async (password: string): Promise<string> => {
  return (bcrypt as any).hash(password, 12);
};

const generateToken = () => randomBytes(32).toString('hex');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, password, confirmPassword, lastName, gender, age, phone, comment } = body;

    if (!email || !firstName || !password) {
      return NextResponse.json({ error: 'Email, prénom et mot de passe sont obligatoires' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Les mots de passe ne correspondent pas' }, { status: 400 });
    }

    // Vérification unicité
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Cet email est déjà inscrit. Connectez-vous ou utilisez un autre email.' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const confirmationToken = generateToken();
    
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        firstName,
        lastName,
        gender,
        age,
        phone,
        comment,
        confirmationToken,
        confirmed: true, // Auto-confirmé pour le moment
      },
    });

    console.log('🔐 INSCRIPTION:', email);

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        gender: user.gender,
        age: user.age,
        phone: user.phone,
        confirmed: user.confirmed,
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 });

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (user) {
      await prisma.user.delete({
        where: { email: email.toLowerCase().trim() }
      });
      return NextResponse.json({ deleted: email });
    }
    return NextResponse.json({ error: 'Email non trouvé' }, { status: 404 });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
