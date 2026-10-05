// Primitives visuelles de l'historique des tirages (etape 2/3 du decoupage).
// Icones SVG inline, sceau d'augure, vignettes de cartes et surlignage du
// mot-cle recherche. Deplacees telles quelles depuis page.tsx.

import { metaOf, type Reading } from './readings-data';

// --- Icônes SVG inline (charte unifiée, remplace les emojis) ---
export function Svg({ children, size = 15, className = '', style }: { children: React.ReactNode; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
      {children}
    </svg>
  );
}
export const ChevronIcon = (p: { size?: number; className?: string; style?: React.CSSProperties }) => (
  <Svg {...p}><polyline points="9 6 15 12 9 18" /></Svg>
);
export const TrashIcon = (p: { size?: number; className?: string; style?: React.CSSProperties }) => (
  <Svg {...p}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></Svg>
);
export const ShareIcon = (p: { size?: number; className?: string; style?: React.CSSProperties }) => (
  <Svg {...p}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></Svg>
);
export const ClockIcon = (p: { size?: number; className?: string; style?: React.CSSProperties }) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" /></Svg>
);

// --- Point augure : un sceau est né de cette lecture (compact, sans texte) ---
// Trois états : en attente (horloge teal), à vérifier (horloge dorée pulsante), clos (✶).
export function EchoDot({ echo, t }: { echo: NonNullable<Reading['echo']>; t: (k: string) => string }) {
  if (echo.verdict) {
    return (
      <span className="shrink-0 text-[11px] leading-none" style={{ color: '#b8963e', opacity: 0.85 }}
            title={`${t('echo.closed')}: ${t(`echo.verdict.${echo.verdict}`)}`}>✶</span>
    );
  }
  const due = new Date(echo.dueAt).getTime() <= Date.now();
  return (
    <span className={`shrink-0 ${due ? 'animate-pulse' : ''}`} title={due ? t('echo.dueBadge') : t('echo.pending')}>
      <ClockIcon size={13} style={{ color: due ? '#DAA520' : '#4db8c4' }} />
    </span>
  );
}

// --- Aperçu visuel du tirage (mini-vignettes repliées sur elles-mêmes) ---
// Tarot : art réel des lames (/cards/arcana/{id}.jpg). Runes : glyphes ᚠ.
// Dés : symboles ☿/♄. Yi Jing : hexagramme. Max 5, renversées pivotées.
export function ReadingThumb({ group, card, idx }: { group: string; card: any; idx: number }) {
  const base = 'shrink-0 rounded-md flex items-center justify-center leading-none';
  const st: React.CSSProperties = { width: 30, height: 42, fontSize: 15 };
  if (group === 'tarot') {
    const id = typeof card === 'number' ? card : (card?.id ?? card?.name?.id);
    const rev = typeof card === 'object' && card?.reversed;
    // id < 0 : jour non révélé (roue hebdo) → dos de carte, pas de spoiler.
    if (Number(id) < 0) {
      return (
        <span key={idx} className={base} style={{ ...st, overflow: 'hidden', border: '1px solid rgba(218,165,32,0.35)', background: '#1a0a2e' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/card-back.png" alt="" className="w-full h-full object-cover" loading="lazy" />
        </span>
      );
    }
    return (
      <span key={idx} className={base} style={{ ...st, overflow: 'hidden', border: '1px solid rgba(218,165,32,0.35)', transform: rev ? 'rotate(180deg)' : undefined, background: '#1a0a2e' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/cards/arcana/${Number(id) || 0}.jpg`} alt="" className="w-full h-full object-cover" loading="lazy" />
      </span>
    );
  }
  if (group === 'rune') {
    const rev = card?.reversed;
    return (
      <span key={idx} className={base} style={{ ...st, border: '1px solid rgba(138,109,59,0.45)', background: 'rgba(138,109,59,0.14)', color: '#e9d9ac', transform: rev ? 'rotate(180deg)' : undefined }}>
        {card?.symbol || 'ᛟ'}
      </span>
    );
  }
  if (group === 'des') {
    return (
      <span key={idx} className={base} style={{ ...st, border: '1px solid rgba(46,134,193,0.4)', background: 'rgba(46,134,193,0.12)', color: '#7FB3D5', fontSize: 16 }}>
        {card?.value || '⚄'}
      </span>
    );
  }
  // yijing : hexagramme (symbole Unicode ou nom)
  return (
    <span key={idx} className={base} style={{ ...st, border: '1px solid rgba(180,140,220,0.4)', background: 'rgba(180,140,220,0.12)', color: '#E0CFF0', fontSize: 18 }}>
      {card?.symbol || '䷊'}
    </span>
  );
}
export function ReadingThumbs({ r }: { r: Reading }) {
  const group = metaOf(r).group;
  const cards: any[] = Array.isArray(r.cards) ? r.cards : [];
  let shown = cards.slice(0, 5);
  // Roue hebdo : une seule vignette — la carte du jour (dernier jour révélé).
  if (r.type === 'tarot-semaine') {
    const open = cards.map((c: any, i: number) => (((typeof c === 'number' ? c : c?.id) ?? -1) >= 0 ? i : -1)).filter((i: number) => i >= 0);
    shown = [cards[open.length ? open[open.length - 1] : 0]];
  }
  if (r.type === 'yi-jing-double') shown = cards.slice(0, 2).map((c: any) => ({ symbol: c?.glyph || '' }));
  if (shown.length === 0) return null;
  return (
    <span className="flex items-center gap-1 shrink-0 -mr-1">
      {shown.map((c, i) => <ReadingThumb key={i} group={group} card={c} idx={i} />)}
    </span>
  );
}

// Souligne les occurrences du mot-clé recherché (insensible à la casse)
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const parts: (string | JSX.Element)[] = [];
  let i = 0;
  let idx = lower.indexOf(ql);
  while (idx !== -1) {
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark key={idx} className="rounded px-0.5 font-semibold" style={{
        background: 'rgba(255, 215, 0, 0.18)',
        color: '#FFE9A8',
        textShadow: '0 0 16px rgba(255, 215, 0, 1), 0 0 28px rgba(255, 215, 0, 0.6)',
        boxShadow: '0 0 10px rgba(255, 215, 0, 0.45)',
      }}>{text.slice(idx, idx + q.length)}</mark>
    );
    i = idx + q.length;
    idx = lower.indexOf(ql, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return <>{parts}</>;
}
