import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ── pay-return : page relais de retour de paiement (APK) ───────────────
// Stripe n'accepte que des success_url http(s) : on ne peut pas mettre un
// deep link tarotdivination:// directement dans la session. Cette page est
// le relais : Stripe y redirige le Custom Tab, et elle bascule IMMÉDIATEMENT
// dans l'app via le schéma custom (Android ouvre l'APK — BROWSABLE + filtre
// du manifest). Sans JS (navigateur desktop), un lien manuel est présenté.
//
// Aucune donnée d'app n'est rendue ici → conforme à la porte web Play Store.
// Public dans middleware (PUBLIC_PATHS) : sinon la porte renverrait 403.

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const next = sp.get('next') || '/dashboard/account/abonnement';
  if (!next.startsWith('/')) {
    return NextResponse.redirect(new URL('/dashboard/account/abonnement', request.url));
  }
  // Reconstruire le chemin interne avec SA query d'origine (session_id, status).
  const q = new URLSearchParams();
  for (const [k, v] of sp.entries()) if (k !== 'next') q.set(k, v);
  const qs = q.toString();
  const path = qs ? `${next}?${qs}` : next;
  const deep = `tarotdivination://open?url=${encodeURIComponent(path)}`;

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Retour vers l'app — Oracle des Étoiles</title>
<script>location.replace(${JSON.stringify(deep)});</script>
<style>body{background:#0d1b2a;color:#e8d5a3;font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}a{color:#e8d5a3}</style>
</head><body>
<div style="text-align:center;max-width:24em">
<p>Retour vers l’application…</p>
<p><a href="${esc(deep)}">Ouvrir l’app maintenant</a></p>
</div>
</body></html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
