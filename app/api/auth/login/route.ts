import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const DB_FILE = join(process.cwd(), '.registered-emails.json');

const hashEmailForLookup = (email: string): string => {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    const emailStore = existsSync(DB_FILE) 
      ? new Map(JSON.parse(readFileSync(DB_FILE, 'utf-8'))) 
      : new Map();

    const emailKey = hashEmailForLookup(email);

    if (!emailStore.has(emailKey)) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
    }

    const userData = emailStore.get(emailKey);
    const hashedPassword = (userData as any).password;

    const isValid = await (bcrypt as any).compare(password, hashedPassword);

    if (!isValid) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
    }

    const { password: _, ...userWithoutPassword } = userData as any;

    return NextResponse.json({
      success: true,
      user: {
        email,
        firstName: (userData as any).firstName,
        ...userWithoutPassword,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
