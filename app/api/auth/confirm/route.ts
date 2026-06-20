import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/auth/signup?error=no_token', request.url));
    }

    // Find user by confirmation token
    const user = await prisma.user.findFirst({
      where: { confirmationToken: token }
    });

    if (!user) {
      return NextResponse.redirect(new URL('/auth/signup?error=invalid_token', request.url));
    }

    // Mark user as confirmed and clear the token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        confirmed: true,
        confirmationToken: null,
      },
    });

    // Redirect to login with confirmation success
    return NextResponse.redirect(new URL('/auth/login?confirmed=1', request.url));
  } catch (error) {
    console.error('Confirm error:', error);
    return NextResponse.redirect(new URL('/auth/signup?error=server_error', request.url));
  }
}
