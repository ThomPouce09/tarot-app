import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/auth/signup?error=no_token', request.url));
  }

  const user = await prisma.user.findFirst({
    where: { confirmationToken: token },
  });

  if (!user) {
    return NextResponse.redirect(new URL('/auth/signup?error=invalid_token', request.url));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      confirmed: true,
      confirmationToken: null,
    },
  });

  return NextResponse.redirect(new URL('/dashboard/account?confirmed=1', request.url));
}
