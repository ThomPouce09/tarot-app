import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

// Hash SHA256 pour comparaison d'unicité (email en minuscules)
const hashEmailForLookup = (email: string): string => {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
};

const hashPassword = async (password: string): Promise<string> => {
  return (bcrypt as any).hash(password, 12);
};

const generateToken = () => randomBytes(32).toString('hex');

const DB_FILE = join(process.cwd(), '.registered-emails.json');

let emailStore: Map<string, any> = new Map();

const loadStore = () => {
  if (existsSync(DB_FILE)) {
    try {
      const data = JSON.parse(readFileSync(DB_FILE, 'utf-8'));
      emailStore = new Map(data);
    } catch {
      emailStore = new Map();
    }
  }
};

const saveStore = () => {
  try {
    writeFileSync(DB_FILE, JSON.stringify(Array.from(emailStore.entries()), null, 2));
  } catch {}
};

loadStore();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, password, confirmPassword, lastName, gender, age, phone, comment, turnstileToken } = body;


    if (!email || !firstName || !password) {
      return NextResponse.json({ error: 'Email, prénom et mot de passe sont obligatoires' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Les mots de passe ne correspondent pas' }, { status: 400 });
    }

    const emailKey = hashEmailForLookup(email);

    // Vérification unicité
    if (emailStore.has(emailKey)) {
      return NextResponse.json({ error: 'Cet email est déjà inscrit. Connectez-vous ou utilisez un autre email.' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    
    emailStore.set(emailKey, {
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      firstName,
      lastName,
      gender,
      age,
      phone,
      comment,
      token: generateToken(),
      confirmed: true,
    });
    
    saveStore();

    console.log('🔐 INSCRIPTION:', email);

    return NextResponse.json({
      success: true,
      user: {
        email: email.toLowerCase().trim(),
        firstName,
        lastName,
        gender,
        age,
        phone,
        confirmed: true,
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

  const emailKey = hashEmailForLookup(email);
  
  if (emailStore.has(emailKey)) {
    emailStore.delete(emailKey);
    saveStore();
    return NextResponse.json({ deleted: email });
  }
  return NextResponse.json({ error: 'Email non trouvé' }, { status: 404 });
}
