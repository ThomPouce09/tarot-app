import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const DB_FILE = join(process.cwd(), '.registered-emails.json');

const hashEmailForLookup = (email: string): string => {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
};

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const emailStore = existsSync(DB_FILE) 
      ? new Map(JSON.parse(readFileSync(DB_FILE, 'utf-8'))) 
      : new Map();

    const emailKey = hashEmailForLookup(email);

    if (emailStore.has(emailKey)) {
      emailStore.delete(emailKey);
      writeFileSync(DB_FILE, JSON.stringify(Array.from(emailStore.entries()), null, 2));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
