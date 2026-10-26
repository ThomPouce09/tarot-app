import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Préférences → « Nous suivre » (point 6) : liens officiels Instagram,
// Facebook et TikTok de l'app. Stockés en base Neon (table social_links, une
// ligne par réseau) : le propriétaire remplit les URLs quand les pages sont
// créées, sans redéploiement. Lecture PUBLIQUE (pas de session) — l'URL d'un
// compte public n'est pas une donnée sensible.
// ⚠️ $queryRaw plutôt que prisma.socialLink : le client généré localement peut
// être antérieur à la table (le serveur dev verrouille la DLL → pas de
// generate) ; le SQL fonctionne sur les deux (généré à jour ou non).

export interface SocialLinkRow {
  key: string;
  url: string;
  visible: boolean;
}

const KEYS = ['instagram', 'facebook', 'tiktok'] as const;

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<SocialLinkRow[]>`
      SELECT key, url, visible FROM social_links
    `;
    const byKey = new Map(rows.map((r) => [r.key, r]));
    // Ordre d'affichage voulu. Les réseaux sans URL sont RENVOYÉS (url: '') :
    // la page Préférences les affiche grisés « bientôt disponible » — la
    // section est visible dès maintenant, le propriétaire n'a qu'à remplir
    // l'URL dans Neon quand les pages existent.
    const links = KEYS
      .map((k) => byKey.get(k))
      .filter((r): r is SocialLinkRow => !!r && r.visible)
      .map((r) => ({ key: r.key, url: r.url.trim() }));
    return NextResponse.json({ links });
  } catch (error) {
    console.error('/api/social error:', error);
    // Table absente (avant premier db push en prod) ou froid Neon : la section
    // s'affiche sans liens — jamais une page blanche.
    return NextResponse.json({ links: [] });
  }
}
