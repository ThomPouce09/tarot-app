'use client';

// components/social-links-panel.tsx — Section « Nous suivre » de la page
// Préférences (point 6). Lit GET /api/social (table Neon social_links) :
// chaque réseau (Instagram / Facebook / TikTok) n'apparaît que si son URL est
// renseigné et visible en base. Icônes SVG inline (charte maison : jamais
// d'emoji ni de pack d'icônes), glyphes 20 px dans pastilles rondes cerclées
// d'or sur bois, libellé à droite — même famille visuelle que les panneaux
// mystic-panel de la page.

import { useEffect, useState } from 'react';
import type { useT } from '@/lib/i18n';

type Link = { key: 'instagram' | 'facebook' | 'tiktok'; url: string };
const ORDER: Link['key'][] = ['instagram', 'facebook', 'tiktok'];

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14.5 8.5h3" />
      <path d="M14.5 8.5c0-2.2 1.1-3.5 3.5-3.5" />
      <path d="M11 21V12" />
      <path d="M11 14.5H7.5" />
      <path d="M11 14.5V12.8c0-1.6 1-2.8 2.7-2.8" />
    </svg>
  );
}
function TikTokIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 8.5v7.2a3.2 3.2 0 1 1-2.6-3.15" />
      <path d="M10 8.5c.8 2 2.3 3.1 4.5 3.3" />
      <path d="M14.5 11.8c-.6-2.4.3-4.6 2.4-5.6" />
      <path d="M16.9 6.2c.2 1.5 1 2.5 2.6 2.7" />
    </svg>
  );
}

const ICONS: Record<Link['key'], () => JSX.Element> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  tiktok: TikTokIcon,
};

export default function SocialLinksPanel({ t }: { t: ReturnType<typeof useT> }) {
  const [links, setLinks] = useState<Link[]>([]);

  useEffect(() => {
    let alive = true;
    fetch('/api/social')
      .then((r) => (r.ok ? r.json() : { links: [] }))
      .then((d) => { if (alive && Array.isArray(d.links)) setLinks(d.links); })
      .catch(() => { /* hors ligne : section silencieuse */ });
    return () => { alive = false; };
  }, []);

  // Les trois réseaux sont TOUJOURS présentés (demande user) ; ceux dont l'URL
  // n'est pas encore renseignée en base apparaissent grisés « bientôt ». Le
  // propre de la section ne dépend donc plus du remplissage des URLs.
  const urlOf = (k: Link['key']) => links.find((l) => l.key === k && l.url)?.url ?? '';

  return (
    <div className="mystic-panel p-5">
      <h2 className="mystic-subtitle text-sm mb-1">{t('prefs.social')}</h2>
      <p className="text-gray-400 text-xs leading-relaxed mb-3">{t('prefs.socialHint')}</p>
      <div className="flex flex-col gap-2">
        {ORDER.map((key) => {
          const Icon = ICONS[key];
          const url = urlOf(key);
          const soon = url === '';
          const inner = (
            <>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{
                  border: `1px solid ${soon ? 'rgba(218,165,32,0.25)' : 'rgba(218,165,32,0.55)'}`,
                  color: soon ? 'rgba(218,165,32,0.4)' : '#DAA520',
                  background: 'rgba(8,5,3,0.4)',
                }}
              >
                <Icon />
              </span>
              <span className="text-sm font-semibold" style={soon ? { color: 'rgba(245,234,214,0.45)' } : undefined}>
                {t(`prefs.social.${key}`)}
              </span>
              {soon && (
                <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] italic" style={{ color: 'rgba(218,165,32,0.55)', border: '1px solid rgba(218,165,32,0.25)' }}>
                  {t('prefs.socialSoon')}
                </span>
              )}
            </>
          );
          const box: React.CSSProperties = {
            background: 'linear-gradient(135deg, rgba(90,58,30,0.5), rgba(58,36,16,0.5))',
            border: `1px solid ${soon ? 'rgba(218,165,32,0.18)' : 'rgba(218,165,32,0.35)'}`,
            boxShadow: 'inset 0 1px 0 rgba(240,199,94,0.07)',
            color: '#F5EAD6',
            opacity: soon ? 0.75 : 1,
          };
          if (soon) {
            return (
              <div key={key} className="flex items-center gap-3 rounded-[0.6rem] px-3 py-2.5" style={box} aria-disabled>
                {inner}
              </div>
            );
          }
          return (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-[0.6rem] px-3 py-2.5 transition-all duration-200 hover:brightness-110"
              style={box}
            >
              {inner}
            </a>
          );
        })}
      </div>
    </div>
  );
}
