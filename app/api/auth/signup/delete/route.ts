import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Endpoint temporaire pour supprimer un utilisateur par email (dev uniquement)
export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  
  if (!email) {
    return NextResponse.json({ error: 'Email requis' }, { status: 400 });
  }

  try {
    const { db, users } = await import('../../../../lib/db');
    
    await db.delete(users).where(
      (u, { eq }) => eq(u.email, email)
    );
    
    return NextResponse.json({ success: true, message: `Utilisateur ${email} supprimé` });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 });
  }
}