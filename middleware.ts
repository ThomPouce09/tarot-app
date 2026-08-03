import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// CORS pour l'APK Capacitor : la WebView a pour origine `https://localhost`
// (androidScheme Capacitor) et appelle le backend /api/* en cross-origin.
// Sans ces headers, le fetch échoue silencieusement (« Erreur de connexion »).
// Le web (same-origin) n'est pas affecté.
const ALLOWED_ORIGINS = new Set(['https://localhost', 'http://localhost']);

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '';
  const isApi = request.nextUrl.pathname.startsWith('/api/');
  const isAllowed = ALLOWED_ORIGINS.has(origin);

  // Preflight OPTIONS (requête CORS simple depuis la WebView)
  if (isApi && isAllowed && request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Réponse normale — ajoute les headers CORS si l'origine est autorisée
  if (isApi && isAllowed) {
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
