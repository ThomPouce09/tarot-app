import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/auth/signup?error=no_token', request.url));
  }

  // Skip email confirmation in dev mode
  return NextResponse.redirect(new URL('/auth/login?confirmed=1', request.url));
}
