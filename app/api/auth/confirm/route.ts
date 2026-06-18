import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/auth/signup?error=no_token', request.url));
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.redirect(new URL('/auth/login?message=confirmed_dev', request.url));
  }

  try {
    const { db, users } = await import('../../../lib/db');
    
    // Valide que le token existe et que l'email n'est pas déjà confirmé
    const existingUser = await db.query.users.findFirst({
      where: (u, { eq, and }) => 
        and(eq(u.confirmationToken, token), eq(u.emailConfirmed, false)),
    });

    if (!existingUser) {
      return NextResponse.redirect(new URL('/auth/signup?error=invalid_token', request.url));
    }

    // Confirme l'email
    await db.update(users)
      .set({ emailConfirmed: true, confirmationToken: null })
      .where({ email: existingUser.email });

    return NextResponse.redirect(
      new URL('/auth/login?message=confirmed', request.url)
    );
  } catch (error: any) {
    console.error('Confirmation error:', error);
    return NextResponse.redirect(new URL('/auth/signup?error=server_error', request.url));
  }
}