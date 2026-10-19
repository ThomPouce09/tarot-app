'use client';

// Vues de rendu de l'historique, par univers (etape 3/3 du decoupage).
// Deplacees telles quelles depuis page.tsx : rendu markdown, etats vides et
// une vue par type de tirage. Aucune logique modifiee.

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { TAROT_CARDS } from '@/lib/tarot-data';
import { useT, useLang, pick4, contentLang, pickContent, tr, type Lang } from '@/lib/i18n';
import { cardDisplayName } from '@/lib/i18n/cards';
import { pickEchoText } from '@/lib/i18n/echo-text';
import { localizePosition } from '@/lib/i18n/positions';
import { PLANET_NAMES, SIGN_NAMES } from '@/app/des-divinatoires/_shared';
import HEX_J from '@/lib/yj-hexagrams.json';
import { DES_CHOIX_KINDS, loc, tarot3Positions, tarot5Positions, type Reading } from './readings-data';
import { Highlight } from './readings-parts';

// ── Rendu markdown simple (## headings, **bold**, *italic*) ──
function renderMd(text: string, query = ''): React.ReactNode {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={key++} className="text-[10px] font-bold uppercase tracking-wider mt-2 mb-0.5" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#b8944d' }}>{inlineMd(trimmed.slice(3))}</h3>);
    } else if (trimmed.startsWith('# ')) {
      elements.push(<h4 key={key++} className="text-[10px] font-bold mt-1.5 mb-0.5" style={{ fontFamily: 'var(--font-cinzel), serif', color: '#c49460' }}>{inlineMd(trimmed.slice(2))}</h4>);
    } else if (trimmed) {
      elements.push(<p key={key++} className="mb-0.5 leading-relaxed text-xs" style={{ color: '#ccc' }}>{inlineMd(trimmed)}</p>);
    }
  }
  return elements.length > 0 ? <div className="space-y-1">{elements}</div> : null;
}

// Rendu markdown inline (**bold**, *italic*) - version simple (pas de Highlight)
function inlineMd(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#87CEEB' }}>{part.slice(2, -2)}</strong>;
    }
    const italicParts = part.split(/(\*[^*]+\*)/);
    return italicParts.map((sub, j) => {
      if (sub.startsWith('*') && sub.endsWith('*')) {
        return <em key={`${i}-${j}`} style={{ fontStyle: 'italic', opacity: 0.85 }}>{sub.slice(1, -1)}</em>;
      }
      return sub;
    });
  });
}

// --- Sous-composants ---
export function EmptyState() {
  const t = useT();
  return (
    <div className="flex min-h-[56vh] w-full flex-col items-center justify-center bg-gray-900/60 border border-amber-800/30 rounded-lg p-10 text-center">
      <div className="mb-4" style={{ filter: 'drop-shadow(0 0 16px rgba(167,139,250,0.5))' }} aria-hidden>
        <svg width="88" height="88" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="cbOrb" cx="38%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#EFE6FF" />
              <stop offset="32%" stopColor="#C4B5FD" />
              <stop offset="64%" stopColor="#7C5CE0" />
              <stop offset="100%" stopColor="#241145" />
            </radialGradient>
            <radialGradient id="cbHalo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#DAA520" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#DAA520" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="cbBase" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F0C75E" />
              <stop offset="55%" stopColor="#B8860B" />
              <stop offset="100%" stopColor="#4A2E0C" />
            </linearGradient>
          </defs>
          <circle cx="48" cy="40" r="36" fill="url(#cbHalo)" />
          <circle cx="48" cy="40" r="27" fill="url(#cbOrb)" stroke="rgba(240,199,94,0.6)" strokeWidth="1.3" />
          <path d="M29 35c5-9 17-13 26-9 8 3 10 11 6 16-5 7-16 8-23 4" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
          <ellipse cx="40" cy="30" rx="5.5" ry="3.8" fill="rgba(255,255,255,0.8)" opacity="0.75" transform="rotate(-24 40 30)" />
          <path d="M57 48l1.7 3.9L63 53.5l-4.3 1.6L57 59l-1.7-3.9L51 53.5l4.3-1.6z" fill="#F3D9A6" opacity="0.95" />
          <path d="M33 20l1.2 2.7 2.7 1.2-2.7 1.2L33 27.8l-1.2-2.7-2.7-1.2 2.7-1.2z" fill="#fff" opacity="0.85" />
          <path d="M27 66h42l-4.6 9.4c-.9 1.9-2.8 3.1-4.8 3.1H36.4c-2 0-3.9-1.2-4.8-3.1z" fill="url(#cbBase)" stroke="rgba(74,46,12,0.9)" strokeWidth="1" />
          <ellipse cx="48" cy="67" rx="21" ry="3.4" fill="rgba(255,255,255,0.25)" />
        </svg>
      </div>
      <p className="text-amber-200/80 text-base mb-1 font-semibold" style={{ fontFamily: 'var(--font-cinzel-deco), serif' }}>{t('history.emptyTitle')}</p>
      <p className="text-gray-500 text-xs mb-6" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{t('history.emptyText')}</p>
      <div className="grid w-full grid-cols-2 gap-2.5 justify-items-center max-w-2xl mx-auto">
        {([
          { href: '/tarot', img: '/images/tarot-icon.png', label: t('history.doTarot'), color: '#DAA520', tint: 'rgba(218,165,32,0.16)' },
          { href: '/yi-jing', img: '/images/yi-jing-icon.png', label: t('history.doYijing'), color: '#F0463C', tint: 'rgba(240,70,60,0.15)' },
          { href: '/runes', img: '/images/runes-icon.png', label: t('history.doRunes'), color: '#3CB371', tint: 'rgba(60,179,113,0.14)' },
          { href: '/des-divinatoires', img: '/images/des-zodiaque.png', label: t('history.doDes'), color: '#3D9BE9', tint: 'rgba(61,155,233,0.14)' },
        ] as const).map((u) => (
          <Link key={u.href} href={u.href}
            className="group inline-flex w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl px-2.5 py-3 text-[11px] font-semibold leading-snug transition-all duration-200 hover:scale-[1.04] hover:brightness-125 active:scale-[0.97]"
            style={{
              color: u.color,
              background: `linear-gradient(180deg, rgba(255,255,255,0.16) 0%, ${u.tint} 42%, ${u.tint} 100%)`,
              border: `1.5px solid ${u.color}66`,
              boxShadow: `0 0 16px ${u.color}2e, 0 4px 12px rgba(0,0,0,0.45), inset 0 -3px 8px rgba(0,0,0,0.35)`,
              fontFamily: 'var(--font-cinzel), serif',
            }}>
            <img src={u.img} alt="" className="h-8 w-8 shrink-0 object-contain drop-shadow-[0_0_6px_rgba(255,255,255,0.3)] transition-transform duration-300 group-hover:scale-110" />
            <span className="min-w-0 text-center break-words">{u.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Le Double Hexagramme (zhi gua) : vue « présent → futur » ──────────
export function DoubleHexView({ r }: { r: Reading }) {
  const lang = useLang();
  const t = useT();
  const en = lang === 'en';
  const GOLD = '#F3C969';
  const IVORY = '#F5EAD6';
  let st: {
    castAt?: string; lignes?: number[]; mutants?: number[];
    hexPresent?: number; hexFutur?: number;
    names?: { pFr: string; pEn: string; fFr: string; fEn: string };
    read?: { sections: { key: string; fr: string; en: string; es?: string; hi?: string }[]; dueInDays: number } | null;
  } | null = null;
  try { st = JSON.parse(r.interpretation || 'null'); } catch { st = null; }
  if (!st || !Array.isArray(st.lignes) || !st.hexPresent) {
    return <p className="text-gray-500 text-xs italic mt-3">—</p>;
  }
  const hexRow = (n: number) => (HEX_J as unknown as Record<string, { c: string; b: string }>)[String(n)] || null;
  const gp = st.hexPresent ? hexRow(st.hexPresent) : null;
  const gf = st.hexFutur ? hexRow(st.hexFutur) : null;
  const mutSet = new Set(st.mutants || []);
  const Column = ({ numero, future }: { numero?: number; future?: boolean }) => {
    const row = numero ? hexRow(numero) : null;
    if (!row) return null;
    return (
      <div className="flex flex-col-reverse items-center gap-1.5">
        {row.b.split('').map((bit, i) => {
          const yang = bit === '1';
          const hit = future && mutSet.has(i);
          return (
            <div key={i} className="w-24">
              {yang ? (
                <div className="h-[6px] rounded-sm" style={{ background: hit ? '#FF6B5E' : GOLD }} />
              ) : (
                <div className="flex justify-between">
                  <div className="h-[6px] w-[38%] rounded-sm" style={{ background: hit ? '#FF6B5E' : GOLD }} />
                  <div className="h-[6px] w-[38%] rounded-sm" style={{ background: hit ? '#FF6B5E' : GOLD }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  const SEC_LABELS: Record<string, { fr: string; en: string; es?: string; hi?: string }> = {
    situation: { fr: 'La situation', en: 'The situation' , es: "La situación", hi: "स्थिति"},
    bascule: { fr: 'Le point de bascule', en: 'The hinge' , es: "El punto de inflexión", hi: "मोड़"},
    direction: { fr: 'La direction', en: 'Where it turns' , es: "La dirección", hi: "दिशा"},
    conseil: { fr: 'Le conseil', en: 'The counsel' , es: "El consejo", hi: "सलाह"},
  };
  return (
    <div className="mt-4 space-y-4">
      {r.question && (
        <div className="bg-amber-950/15 border border-amber-700/30 rounded-lg p-3 text-center">
          <p className="text-amber-500/70 text-[10px] uppercase tracking-wide mb-1" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{t('history.yourQuestion')}</p>
          <p className="text-amber-200 italic text-sm">&laquo; {r.question} &raquo;</p>
        </div>
      )}
      <div className="flex items-start justify-center gap-8 rounded-2xl p-4" style={{ background: 'rgba(10,5,7,0.6)', border: `1px solid ${GOLD}33` }}>
        <div className="flex flex-col items-center gap-2">
          <p className="text-[9px] uppercase tracking-[0.3em]" style={{ color: `${GOLD}aa` }}>{pick4('Présent', 'Present', 'Presente', 'वर्तमान')(lang)}</p>
          <p className="font-[family-name:var(--font-cinzel-deco)] text-lg" style={{ color: GOLD }}>#{st.hexPresent} {gp?.c}</p>
          <p className="text-[10px] italic text-center max-w-[130px]" style={{ color: IVORY }}>{st.names ? (en ? st.names.pEn : st.names.pFr) : ''}</p>
          <Column numero={st.hexPresent} />
        </div>
        <p className="self-center text-lg" style={{ color: `${GOLD}cc` }}>➔</p>
        <div className="flex flex-col items-center gap-2">
          <p className="text-[9px] uppercase tracking-[0.3em]" style={{ color: '#FF6B5Ecc' }}>{pick4('En devenir', 'Becoming', 'En camino', 'बनते हुए')(lang)}</p>
          <p className="font-[family-name:var(--font-cinzel-deco)] text-lg" style={{ color: GOLD }}>#{st.hexFutur} {gf?.c}</p>
          <p className="text-[10px] italic text-center max-w-[130px]" style={{ color: IVORY }}>{st.names ? (en ? st.names.fEn : st.names.fFr) : ''}</p>
          <Column numero={st.hexFutur} future />
        </div>
      </div>
      <p className="text-center text-[10px]" style={{ color: `${GOLD}99` }}>
        {mutSet.size
          ? `${t('history.movingLines')} : ${[...mutSet].map((i) => i + 1).join('·')} ✦`
          : t('history.stableLines')}
      </p>
      {st.read?.sections?.map((s) => (
        <div key={s.key} className="rounded-xl p-3" style={{ background: 'rgba(142,28,34,0.10)', border: '1px solid rgba(243,201,105,0.15)' }}>
          <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: `${GOLD}bb` }}>{pickContent(SEC_LABELS[s.key] ?? { fr: '' }, lang)}</p>
          <p className="mt-1 text-sm italic leading-relaxed" style={{ color: IVORY, fontFamily: 'var(--font-cinzel), serif' }}>« {en ? s.en : s.fr} »</p>
        </div>
      ))}
      {r.echo && (
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(243,201,105,0.06)', border: `1px solid ${GOLD}44` }}>
          <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: `${GOLD}bb` }}>{t('echo.title')}</p>
          <p className="mt-1 text-xs italic" style={{ color: IVORY }}>
            {pickEchoText(r.echo, lang) || `🔒 ${t('echo.masked')}`}
          </p>
          <p className="mt-1 text-[11px]" style={{ color: r.echo.verdict ? GOLD : '#FF6B5E' }}>
            {r.echo.verdict
              ? `✓ ${r.echo.verdictPct ?? (r.echo.verdict === 'oui' ? 100 : r.echo.verdict === 'partiel' ? 50 : 0)}%`
              : `${t('history.due')} ${new Date(r.echo.dueAt).toLocaleDateString(loc(lang), { day: '2-digit', month: 'long', year: 'numeric' })}`}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Hexagramme du Jour : rendu fidèle à la page du tirage ──
// Historique stockait {numero,mutating,transformed} sans le texte : l'API
// rattache désormais nom/idéogramme/pinyin/lignes + conseil IA. Ici : identité
// en or sur laque, 6 lignes pleines/brisées (mutantes marquées d'un cercle
// rouge), flèche vers l'hexagramme transformé, puis le « Conseil du jour ».
export function DailyHexView({ r, query = '' }: { r: Reading; query?: string }) {
  const lang = useLang();
  const t = useT();
  const OR = '#F3C969';
  const OR_DIM = 'rgba(243,201,105,0.55)';
  const IVORY = '#F5EAD6';
  const ROUGE = '#FF6B5E';
  type Card = {
    numero: number; caractere: string; pinyin: string; name: string;
    nameBy?: Record<string, string | null>; lignes: string; mutating?: number[];
    transformed?: number | null; transforming?: boolean;
  };
  const cards = (Array.isArray(r.cards) ? r.cards : []) as unknown as Card[];
  const present = cards.find((c) => c && !c.transforming && Number.isFinite(c.numero));
  const future = cards.find((c) => c && c.transforming && Number.isFinite(c.numero));
  if (!present) {
    return <p className="text-gray-500 text-xs italic mt-3">—</p>;
  }
  const name = (c: Card) => (lang !== 'fr' && c.nameBy && c.nameBy[lang]) || c.name || '';
  const mutSet = new Set((present.mutating || []).map(Number));
  const Ligne = ({ bit, mut }: { bit: string; mut: boolean }) => (
    bit === '1' ? (
      <div className="h-[7px] w-full rounded-full"
        style={{ background: 'linear-gradient(180deg, #ffe9b0 0%, ' + OR + ' 42%, #9c6d22 100%)',
                 boxShadow: 'inset 0 1px 0 rgba(255,244,200,0.85), inset 0 -1px 2px rgba(60,30,0,0.5), 0 2px 6px rgba(0,0,0,0.55)' + (mut ? ', 0 0 12px rgba(180,40,45,0.55)' : '') }} />
    ) : (
      <div className="flex w-full justify-between">
        {[0, 1].map((k) => (
          <div key={k} className="h-[7px] w-[42%] rounded-full"
            style={{ background: 'linear-gradient(180deg, #ffe9b0 0%, ' + OR + ' 42%, #9c6d22 100%)',
                     boxShadow: 'inset 0 1px 0 rgba(255,244,200,0.85), inset 0 -1px 2px rgba(60,30,0,0.5), 0 2px 6px rgba(0,0,0,0.55)' + (mut ? ', 0 0 12px rgba(180,40,45,0.55)' : '') }} />
        ))}
      </div>
    )
  );
  const Column = ({ c, mutating }: { c: Card; mutating?: boolean }) => (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[22px] leading-none" style={{ color: OR, textShadow: '0 0 14px rgba(243,201,105,0.35)' }}>{c.caractere}</p>
      <p className="text-center text-[11px] font-semibold italic leading-tight" style={{ color: IVORY }}>
        <Highlight text={name(c)} query={query} />
      </p>
      <p className="text-[9px] tracking-[0.25em]" style={{ color: OR_DIM }}>#{c.numero} · {c.pinyin}</p>
      <div className="mt-1 flex w-full flex-col gap-[7px]">
        {[...c.lignes].reverse().map((bit, i) => {
          const lineNo = 6 - i; // numéro réel (1 base … 6 sommet)
          const mut = !!mutating && mutSet.has(lineNo);
          return (
            <div key={i} className="relative flex items-center">
              <Ligne bit={bit} mut={mut} />
              {mut && (
                <span className="absolute right-[-2px] top-1/2 h-[9px] w-[9px] -translate-y-1/2 rounded-full"
                  style={{ border: `1.5px solid ${ROUGE}`, background: '#140a0e', boxShadow: `0 0 10px ${ROUGE}` }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
  let advice = '';
  try { advice = String(JSON.parse(r.interpretation || '{}').meditation || ''); } catch { advice = r.interpretation || ''; }
  const hasMut = mutSet.size > 0 && !!future;
  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(160deg, rgba(142,28,34,0.22), rgba(0,0,0,0.45))', border: `1px solid ${OR}44` }}>
        <p className="text-center text-[9px] uppercase tracking-[0.3em]" style={{ color: OR_DIM }}>{t('history.hexagramOf')}</p>
        <div className="mt-3 flex items-center justify-center gap-5">
          <div className="w-[110px]"><Column c={present} mutating /></div>
          {hasMut && (
            <>
              <p className="self-center text-lg" style={{ color: `${OR}cc` }}>➔</p>
              <div className="w-[110px]"><Column c={future!} /></div>
            </>
          )}
        </div>
        {present.mutating && present.mutating.length > 0 && (
          <p className="mt-3 text-center text-[10px]" style={{ color: `${OR}99` }}>
            {t('history.movingLines')} : {[...mutSet].sort((a, b) => a - b).join('·')} ✦
          </p>
        )}
        {present.mutating && present.mutating.length === 0 && (
          <p className="mt-3 text-center text-[10px]" style={{ color: `${OR}88` }}>{t('history.stableLines')}</p>
        )}
      </div>
      {advice && (
        <div className="rounded-xl p-4" style={{ background: 'linear-gradient(160deg, rgba(142,28,34,0.14), rgba(0,0,0,0.32))', border: `1px solid ${OR}33` }}>
          <p className="text-center text-[9px] uppercase tracking-[0.3em]" style={{ color: OR_DIM }}>{t('history.advice')}</p>
          <p className="mt-2 text-center text-[14px] italic leading-relaxed" style={{ color: IVORY, fontFamily: 'var(--font-cormorant), serif' }}>
            <Highlight text={`« ${advice.trim()} »`} query={query} />
          </p>
        </div>
      )}
      {r.echo && (
        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(243,201,105,0.06)', border: `1px solid ${OR}44` }}>
          <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: `${OR}bb` }}>{t('echo.title')}</p>
          <p className="mt-1 text-xs italic" style={{ color: IVORY }}>
            {pickEchoText(r.echo, lang) || `${t('echo.masked')}`}
          </p>
          <p className="mt-1 text-[11px]" style={{ color: r.echo.verdict ? OR : '#FF6B5E' }}>
            {r.echo.verdict
              ? `✓ ${r.echo.verdictPct ?? (r.echo.verdict === 'oui' ? 100 : r.echo.verdict === 'partiel' ? 50 : 0)}%`
              : `${t('history.due')} ${new Date(r.echo.dueAt).toLocaleDateString(loc(lang), { day: '2-digit', month: 'long', year: 'numeric' })}`}
          </p>
        </div>
      )}
    </div>
  );
}

export function YiJingView({ r, interp, query = '' }: { r: Reading; interp: any; query?: string }) {
  const t = useT();
  const isSimpleFormat = r.type === 'yi-jing-simple' || r.type === 'yi-jing-simplifie' || (interp && interp.situation);
  return (
    <div className="mt-4 space-y-4">
      {r.question && (
        <div className="bg-amber-950/15 border border-amber-700/30 rounded-lg p-3 text-center">
          <p className="text-amber-500/70 text-[10px] uppercase tracking-wide mb-1" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{t('history.yourQuestion')}</p>
          <p className="text-amber-200 italic text-sm">&quot;<Highlight text={r.question || ''} query={query} />&quot;</p>
        </div>
      )}
      {r.cards && Array.isArray(r.cards) && r.cards.length > 0 && (
        <div className="text-center">
          <h3 className="text-xl font-serif text-purple-300 mb-1">{r.cards[0]?.name || t('history.hexagram')}</h3>
          {r.cards[0]?.id && <p className="text-purple-400/60 text-xs">{t('history.hexagramNo')}{r.cards[0].id}</p>}
        </div>
      )}

      {isSimpleFormat ? (
        <>
          {interp?.situation && <Block color="purple" icon="📍" title={t('history.block.situation')} text={interp.situation} query={query} />}
          {interp?.defis && <Block color="amber" icon="⚔️" title={t('history.block.defis')} text={interp.defis} query={query} />}
          {interp?.soutien && <Block color="green" icon="🌟" title={t('history.block.soutien')} text={interp.soutien} query={query} />}
          {interp?.issue && <Block color="amber" icon="🔮" title={t('history.block.issue')} text={interp.issue} query={query} />}
          {interp?.conseil && <Block color="green" icon="💡" title={t('history.block.conseil')} text={interp.conseil} query={query} />}
        </>
      ) : (
        <>
          {interp?.meditation && <Block color="purple" icon="🧘" title={t('history.block.meditation')} text={interp.meditation} query={query} />}
          {interp?.conseil && <Block color="amber" icon="💡" title={t('history.block.conseil')} text={interp.conseil} query={query} />}
          {interp?.attitude && <Block color="green" icon="🌿" title={t('history.block.attitude')} text={interp.attitude} query={query} />}
        </>
      )}

      {!interp && r.interpretation && (
        <div className="bg-gray-800/40 rounded-lg p-3">
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap"><Highlight text={r.interpretation || ''} query={query} /></p>
        </div>
      )}
    </div>
  );
}

// ── Roue des Arcanes de la Semaine : historique fidèle à l'usage réel ──
// 4 cartes en haut + 3 en bas ; seules les cartes passées/du jour se touchent
// et livrent leur éclat ; analyse complète (fil rouge) quand la semaine est close.
export function WheelView({ r }: { r: Reading }) {
  const lang = useLang();
  const [sel, setSel] = useState<number | null>(null);
  let st: { castAt?: string; cards?: number[]; revealed?: number[]; days?: ({ fr: string; en: string; es?: string; hi?: string } | null)[]; filRouge?: { fr: string; en: string; es?: string; hi?: string } | null } | null = null;
  try { st = JSON.parse(r.interpretation || 'null'); } catch { st = null; }
  if (!st || !Array.isArray(st.cards) || st.cards.length !== 7) {
    return <p className="text-gray-500 text-xs italic mt-3">—</p>;
  }
  const castWd = new Date(st.castAt || r.createdAt).getDay();
  const DAY_SHORT: Record<Lang, string[]> = {
    fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    hi: ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
  };
  const DAY_FULL = [
    { fr: 'Dimanche', en: 'Sunday' , es: "Domingo", hi: "रविवार"}, { fr: 'Lundi', en: 'Monday' , es: "Lunes", hi: "सोमवार"}, { fr: 'Mardi', en: 'Tuesday' , es: "Martes", hi: "मंगलवार"},
    { fr: 'Mercredi', en: 'Wednesday' , es: "Miércoles", hi: "बुधवार"}, { fr: 'Jeudi', en: 'Thursday' , es: "Jueves", hi: "गुरुवार"}, { fr: 'Vendredi', en: 'Friday' , es: "Viernes", hi: "शुक्रवार"}, { fr: 'Samedi', en: 'Saturday' , es: "Sábado", hi: "शनिवार"},
  ];
  const echo = r.echo;
  const best = echo?.bestCardIndex;
  const isOpen = (d: number) => (st!.cards![d] ?? -1) >= 0;
  const openDays = st.cards.map((_: number, d: number) => (isOpen(d) ? d : -1)).filter((d: number) => d >= 0);
  const active = sel ?? (openDays.length ? openDays[openDays.length - 1] : null);
  const selInsight = active !== null ? (st.days?.[active] ?? null) : null;
  const rows = [st.cards.slice(0, 4), st.cards.slice(4)];
  const weekDone = openDays.length >= 7 || !!echo?.verdict;
  return (
    <div className="mt-4 space-y-3">
      {rows.map((row, ri) => (
        <div key={ri} className="flex items-end justify-center gap-2 sm:gap-3">
          {row.map((id: number, i: number) => {
            const d = ri === 0 ? i : i + 4;
            const open = isOpen(d);
            return (
              <button key={d} type="button" disabled={!open} onClick={() => setSel(d)}
                className="flex flex-col items-center gap-1 disabled:cursor-default" style={{ transform: `rotate(${(i - (ri === 0 ? 1.5 : 1)) * -1.2}deg)` }}>
                <span className="relative block h-20 w-14 overflow-hidden rounded-md border sm:h-24 sm:w-16"
                  style={{
                    borderColor: active === d ? '#F0C75E' : best === d ? '#F0C75E' : 'rgba(218,165,32,0.35)',
                    boxShadow: active === d ? '0 0 16px rgba(240,199,94,0.75)' : best === d ? '0 0 12px rgba(240,199,94,0.6)' : 'none',
                    opacity: open ? 1 : 0.55,
                  }}>
                  {open ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/cards/arcana/${id}.jpg`} alt={TAROT_CARDS[id]?.name || ''} className="h-full w-full object-cover" />
                  ) : (
                    // Jour à venir : dos de carte (l'API ne livre que les jours révélés).
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/images/card-back.png" alt="" className="h-full w-full object-cover opacity-80" />
                  )}
                  {best === d && <span className="absolute inset-x-0 bottom-0 bg-black/70 text-center text-[8px]" style={{ color: '#F0C75E' }}>✦</span>}
                </span>
                <span className="text-[8px] uppercase tracking-wide" style={{ color: active === d ? '#F0C75E' : 'rgba(251,191,36,0.5)' }}>{DAY_SHORT[lang][(castWd + d) % 7]}</span>
              </button>
            );
          })}
        </div>
      ))}
      {/* L'éclat de la carte sélectionnée (jour passé ou courant uniquement). */}
      {active !== null && isOpen(active) && (
        <div className="mx-auto max-w-md rounded-xl px-4 py-3 text-center" style={{
          background: 'linear-gradient(160deg, rgba(74,25,49,0.45) 0%, rgba(24,11,5,0.75) 100%)',
          border: '1px solid rgba(218,165,32,0.45)',
        }}>
          <p className="text-[9px] uppercase tracking-[0.25em]" style={{ color: 'rgba(218,165,32,0.75)' }}>
            {pick4('L’éclat du jour —', 'The card’s light —', "El fulgor del día —", "दिन की ज्योति —")(lang)} {DAY_FULL[(castWd + active) % 7][lang]} · {TAROT_CARDS[st.cards[active]] ? cardDisplayName(TAROT_CARDS[st.cards[active]], lang) : ''}
          </p>
          {selInsight
            ? <p className="mt-1.5 text-[13px] italic leading-relaxed text-amber-100/95" style={{ fontFamily: 'var(--font-cinzel), serif' }}>« {selInsight[contentLang(lang)]} »</p>
            : <p className="mt-1.5 text-[11px] italic text-amber-100/50">{pick4('Pas encore éclairé.', 'Not yet lit.', "Aún no está iluminado.", "अभी रोशनी नहीं पाई।")(lang)}</p>}
        </div>
      )}
      {/* Semaine close : l'analyse complète de l'oracle. */}
      {st.filRouge && (
        <div className="mx-auto max-w-md">
          <p className="text-center text-[9px] uppercase tracking-[0.25em]" style={{ color: 'rgba(218,165,32,0.8)' }}>
            {pick4('L’analyse de la semaine', 'The week’s reading', "El análisis de la semana", "सप्ताह का विश्लेषण")(lang)}
          </p>
          <p className="mt-1 text-center text-sm italic leading-relaxed text-amber-100/90" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
            « {st.filRouge[contentLang(lang)]} »
          </p>
        </div>
      )}
      {echo?.verdict && (
        <p className="text-center text-[11px]" style={{ color: '#F0C75E' }}>
          {pick4('Semaine tenue à', 'Week kept at', "Semana fijada en", "सप्ताह का स्तर:")(lang)} {echo.verdictPct ?? (echo.verdict === 'oui' ? 100 : echo.verdict === 'partiel' ? 50 : 0)}%
          {best !== null && best !== undefined && best >= 0 && st.cards[best] !== undefined && (
            <> · {pick4('carte tenue', 'best card', "mejor carta", "श्रेष्ठ पत्र")(lang)} : {TAROT_CARDS[st.cards[best]] ? cardDisplayName(TAROT_CARDS[st.cards[best]], lang) : ''}</>
          )}
        </p>
      )}
      {!weekDone && !st.filRouge && openDays.length < 7 && (
        <p className="text-center text-[10px] italic text-amber-100/40">
          {pick4('L’analyse complète se libère quand la semaine est bouclée.', 'The full reading unlocks when the week is complete.', "El análisis completo se desbloquea cuando la semana se cierra.", "पूर्ण विश्लेषण तब खुलता है जब सप्ताह पूर्ण हो।")(lang)}
        </p>
      )}
    </div>
  );
}

export function TarotView({ r, interpretation, query = '' }: { r: Reading; interpretation: string; query?: string }) {
  const t = useT();
  const isTarot3 = r.cards.length === 3;
  const positions = isTarot3 ? tarot3Positions : tarot5Positions;
  const interpData = isTarot3
    ? (parseTarot3Inline(interpretation)?.data || {})
    : (parseTarot5Inline(interpretation) || {});

  if (!r.cards || !Array.isArray(r.cards) || r.cards.length === 0) {
    return <p className="text-gray-400 text-xs italic mt-3">&quot;<Highlight text={r.question || ''} query={query} />&quot;</p>;
  }

  return (
    <div className="mt-4 space-y-3">
      {r.question && (
        <div className="bg-amber-950/15 border border-amber-700/30 rounded-lg p-3 text-center">
          <p className="text-amber-500/70 text-[10px] uppercase tracking-wide mb-1" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{t('history.yourQuestion')}</p>
          <p className="text-amber-200 italic text-sm">&quot;<Highlight text={r.question || ''} query={query} />&quot;</p>
        </div>
      )}
      {r.cards.map((c: any, idx: number) => {
        if (isTarot3 && idx >= 3) return null;
        if (idx >= positions.length) return null;
        const pos = positions[idx];
        const cardData = TAROT_CARDS.find((t) => t.id === c.id);
        const cardName = cardData?.name || c.name?.name || c.name || `Carte ${idx + 1}`;
        const text = (interpData as any)[pos.key] as string | undefined;
        if (!text) return null;
        return (
          <div key={idx} className={`${pos.cardColor} border rounded-lg p-3 shadow-sm`}>
            <h4 className={`${pos.titleColor} font-semibold text-sm mb-2 flex items-center gap-2`}>
              <span className="text-base">{pos.icon}</span><span>{t(pos.nameKey)}</span>
              <span className="text-gray-500">—</span>
              <span className="text-gray-100 font-serif italic"><Highlight text={cardName} query={query} /></span>
              {c.reversed && <em className="text-amber-400 text-xs">{t('history.reversed')}</em>}
            </h4>
            <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={text} query={query} /></p>
          </div>
        );
      })}
      {/* Synthèse globale du tirage (nouveau format IA : resume / ancien : resume) */}
      {(interpData as any).resume && (
        <div className="bg-purple-950/15 border border-purple-800/30 rounded-lg p-3">
          <p className="text-purple-300/80 text-[10px] uppercase tracking-wide mb-1" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{t('history.synthesis')}</p>
          <p className="text-gray-100 text-sm leading-relaxed italic"><Highlight text={(interpData as any).resume as string} query={query} /></p>
        </div>
      )}
    </div>
  );
}

// --- Vue détaillée : Runes Scandinaves ---
export function RuneView({ r, query = '' }: { r: Reading; query?: string }) {
  const t = useT();
  const cards: any[] = Array.isArray(r.cards) ? r.cards : [];
  // Carte dépliée (accordéon) : une seule ouverte à la fois ; re-tap ferme.
  // Clé = `${groupe}-${index}` pour distinguer les runes des deux blocs.
  const [openCard, setOpenCard] = useState<string | null>(null);
  // Changement de lecture affichée → replier la carte ouverte.
  useEffect(() => setOpenCard(null), [r.id]);

  // Tente une interprétation structurée (JSON de l'API IA)
  let structured: { sections?: any[]; synthese?: string; conseil_action?: string } | null = null;
  let rawInterpretation = '';
  if (r.interpretation) {
    try {
      const parsed = JSON.parse(r.interpretation);
      if (
        parsed &&
        typeof parsed === 'object' &&
        (parsed.sections || parsed.synthese || parsed.version === 'nornes-full' || parsed.fil || parsed.tissage)
      ) {
        structured = parsed;
      } else {
        rawInterpretation = r.interpretation;
      }
    } catch {
      rawInterpretation = r.interpretation;
    }
  }

  // Normalisation des positions (tirets/dash et apostrophes variantes ignorés).
  const normPos = (s?: string) =>
    (s || '').toLowerCase().replace(/[\u2014\u2013-]/g, '-').replace(/[\u2019']/g, "'").trim();
  const isConseilPos = (s?: string) => normPos(s).includes('conseil');

  // Les tirages nornes COMPLETS (3 Nornes + rune « Conseil d'Odin » du tissage)
  // s'affichent en DEUX blocs distincts :
  //   1. Le Fil des Nornes — 3 runes (analyse IA au tap) + Synthèse + 1er Conseil d'Odin
  //   2. Tisser une nouvelle voie — rune du Conseil (analyse IA au tap) + 2e Conseil d'Odin
  type RunGroup = {
    cards: any[];
    sections: any[];
    synthese?: string;
    conseil_action?: string;
  };
  const parsedAll = structured as (RunGroup & { version?: string; fil?: RunGroup; tissage?: RunGroup }) | null;
  const hasTissage =
    cards.some((c) => isConseilPos(c.position)) ||
    (structured?.sections || []).some((s) => isConseilPos(s.position));

  const groups: RunGroup[] = [];
  if (structured && parsedAll && parsedAll.version === 'nornes-full' && parsedAll.fil && parsedAll.tissage) {
    // Format versionné (nouveaux tirages complets) : blocs déjà séparés.
    groups.push(
      { ...parsedAll.fil, cards: cards.filter((c) => !isConseilPos(c.position)) },
      { ...parsedAll.tissage, cards: cards.filter((c) => isConseilPos(c.position)) },
    );
  } else if (hasTissage) {
    // Tirages complets enregistrés avant le format versionné : on sépare cartes
    // et sections par position (le conseil_action unique est celui du tissage).
    groups.push(
      {
        cards: cards.filter((c) => !isConseilPos(c.position)),
        sections: (structured?.sections || []).filter((s) => !isConseilPos(s.position)),
        synthese: structured?.synthese || '',
      },
      {
        cards: cards.filter((c) => isConseilPos(c.position)),
        sections: (structured?.sections || []).filter((s) => isConseilPos(s.position)),
        conseil_action: structured?.conseil_action || '',
      },
    );
  } else if (structured && ((structured.sections && structured.sections.length > 0) || structured.synthese)) {
    // Tirage simple (3 runes) ou autre : un seul bloc, comme avant.
    groups.push({
      cards,
      sections: structured.sections || [],
      synthese: structured.synthese || '',
      conseil_action: structured.conseil_action || '',
    });
  }
  // Sections d'un groupe sans carte correspondante (sécurité : contenu jamais perdu).
  const orphanSectionsOf = (g: RunGroup) =>
    g.sections.filter(
      (s) =>
        !g.cards.some((c) => {
          const np = normPos(c.position);
          return np !== '' && np === normPos(s.position);
        }),
    );
  // Analyse IA d'une carte = section appariée par position dans son groupe.
  const analysisOf = (g: RunGroup, cardPos?: string) => {
    const np = normPos(cardPos);
    if (!np) return null;
    return g.sections.find((s) => normPos(s.position) === np) || null;
  };

  return (
    <div className="mt-4 space-y-3">
      {r.question && (
        <div className="bg-amber-950/15 border border-amber-700/30 rounded-lg p-3 text-center">
          <p className="text-amber-500/70 text-[10px] uppercase tracking-wide mb-1" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{t('history.yourQuestion')}</p>
          <p className="text-amber-200 italic text-sm">&quot;<Highlight text={r.question || ''} query={query} />&quot;</p>
        </div>
      )}
      {groups.length === 0 && cards.length === 0 ? (
        <p className="text-gray-400 text-xs italic">{tr("Tirage sans détail enregistré.", "Reading with no saved details.", "Tirada sin detalle registrado.", "विवरण-रहित विन्यास दर्ज नहीं हुई।")}</p>
      ) : groups.length > 0 ? (
        groups.map((g, gi) => {
          const isTissage = isConseilPos(g.cards[0]?.position) || (g.sections || []).some((s) => isConseilPos(s.position));
          const orphanSections = orphanSectionsOf(g);
          return (
            <div key={gi} className="space-y-2">
              {/* Titre de bloc (seulement quand il y a fil + tissage) */}
              {groups.length > 1 && (
                <div className="flex items-center gap-3 pt-1.5">
                  <span className="h-px flex-1" style={{ background: 'rgba(212,180,131,0.30)' }} />
                  <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: '#D4B483', fontFamily: 'var(--font-cinzel), serif' }}>
                    {isTissage ? t('runes.nornes.advice') : t('runes.nornes.title')}
                  </span>
                  <span className="h-px flex-1" style={{ background: 'rgba(212,180,131,0.30)' }} />
                </div>
              )}

              {/* Cartes du groupe — tap : analyse IA de la rune */}
              {g.cards.map((c, i) => {
                const sec = analysisOf(g, c.position);
                const key = `${gi}-${i}`;
                const open = openCard === key;
                const expandable = !!sec;
                return (
                  <div
                    key={key}
                    role={expandable ? 'button' : undefined}
                    tabIndex={expandable ? 0 : undefined}
                    aria-expanded={expandable ? open : undefined}
                    onClick={() => { if (expandable) setOpenCard(open ? null : key); }}
                    onKeyDown={
                      expandable
                        ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenCard(open ? null : key); } }
                        : undefined
                    }
                    className={`border rounded-lg p-3 transition-colors ${expandable ? 'cursor-pointer select-none active:bg-black/10' : ''}`}
                    style={{ borderColor: 'rgba(138,109,59,0.35)', background: 'rgba(138,109,59,0.10)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl leading-none shrink-0" style={{ color: '#e9d9ac' }}>{c.symbol || 'ᛟ'}</span>
                      <span className="font-semibold text-sm flex-1" style={{ color: '#D4B483', fontFamily: 'var(--font-cinzel), serif' }}>
                        {c.position || `Rune ${i + 1}`}
                      </span>
                      {c.reversed && <em className="text-amber-400 text-xs shrink-0">{tr("— renversée", "— reversed", "— invertida", "— उल्टी")}</em>}
                      {expandable && (
                        <span
                          className={`text-[10px] shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                          style={{ color: '#D4B483', opacity: 0.6 }}
                        >
                          ▼
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-gray-100 font-serif italic text-sm"><Highlight text={c.name || ''} query={query} /></p>
                    {/* Analyse IA de la rune — révélée uniquement au tap */}
                    {open && sec && (
                      <div className="mt-2.5 border-t pt-2.5 space-y-1.5" style={{ borderColor: 'rgba(138,109,59,0.25)' }}>
                        {sec.sens && (
                          <p className="text-xs italic" style={{ color: '#c4b998' }}>
                            <Highlight text={sec.sens || ''} query={query} />
                          </p>
                        )}
                        {sec.lecture && (
                          <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={sec.lecture || ''} query={query} /></p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Synthèse — uniquement dans le bloc du Fil */}
              {!isTissage && g.synthese && (
                <div className="bg-purple-950/20 border border-purple-800/30 rounded-lg p-3">
                  <h4 className="text-purple-300 font-semibold text-sm mb-1 flex items-center gap-2">
                    <span>📜</span>{t('readings.synthese')}
                  </h4>
                  <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={g.synthese} query={query} /></p>
                </div>
              )}

              {/* Conseil d'Odin (1er : fil — 2e : tissage) */}
              {g.conseil_action && (
                <div className="rounded-lg p-3" style={{ border: '1px solid rgba(212,180,131,0.45)', background: 'rgba(138,109,59,0.14)' }}>
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: '#e9c77b', fontFamily: 'var(--font-cinzel), serif' }}>
                    <span className="text-xs">✦</span>{t('runes.conseilOdin')}
                  </h4>
                  <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={g.conseil_action} query={query} /></p>
                </div>
              )}

              {/* Sections du groupe sans carte associée (sécurité : contenu jamais perdu) */}
              {orphanSections.map((s, i) => (
                <div key={`o${i}`} className="border rounded-lg p-3" style={{ borderColor: 'rgba(138,109,59,0.35)', background: 'rgba(52,42,28,0.50)' }}>
                  <h4 className="font-semibold text-xs mb-1.5 flex items-center gap-2" style={{ color: '#D4B483', fontFamily: 'var(--font-cinzel), serif' }}>
                    <span className="text-base">{s.rune}</span>
                    <span>{localizePosition(s.position)} — <em className="text-amber-400 not-italic">{s.sens}</em></span>
                  </h4>
                  <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={s.lecture} query={query} /></p>
                </div>
              ))}
            </div>
          );
        })
      ) : (
        /* Anciens tirages sans interprétation structurée : cartes seules */
        cards.map((c, i) => (
          <div key={i} className="border rounded-lg p-3" style={{ borderColor: 'rgba(138,109,59,0.35)', background: 'rgba(138,109,59,0.10)' }}>
            <h4 className="font-semibold text-sm mb-1 flex items-center gap-2" style={{ color: '#D4B483', fontFamily: 'var(--font-cinzel), serif' }}>
              <span className="text-2xl leading-none" style={{ color: '#e9d9ac' }}>{c.symbol || 'ᛟ'}</span>
              <span>{c.position || `Rune ${i + 1}`}</span>
              {c.reversed && <em className="text-amber-400 text-xs">{tr("\u2014 renvers\u00e9e", "\u2014 reversed", "\u2014 invertida", "\u2014 \u0909\u0932\u094d\u091f\u0940")}</em>}
            </h4>
            <p className="text-gray-100 font-serif italic text-sm"><Highlight text={c.name || ''} query={query} /></p>
          </div>
        ))
      )}

      {/* Fallback : interprétation texte brut (anciens tirages) */}
      {!structured && rawInterpretation && (
        <div className="bg-gray-800/40 rounded-lg p-3">
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap"><Highlight text={rawInterpretation} query={query} /></p>
        </div>
      )}
    </div>
  );
}

// --- Vue détaillée : Dés zodiacaux ---
export function AstroView({ r, query = '' }: { r: Reading; query?: string }) {
  const t = useT();
  const cards: any[] = Array.isArray(r.cards) ? r.cards : [];
  const kindLabel: Record<string, string> = {
    planet: t('des.kind.planet'),
    sign: t('des.kind.sign'),
    house: t('des.kind.house'),
  };

  // Tente une interprétation structurée (JSON de l'API astro-dice-interpretation)
  // Format 1 (global) : { planet, sign, house, synthese }
  // Format 2 (sections) : { sections: [{ kind, title, text }], synthese }
  // Format 3 (affinage accumulé) : { static, dbInterpretation, oracleFlash, analysisGlobal, analysisRefine, refine }
  let structured: { sections?: { kind: string; title: string; text: string }[]; synthese?: string } | null = null;
  let rawInterpretation = '';
  // Données accumulées (affinage)
  let interpData: Record<string, any> | null = null;

  if (r.interpretation) {
    try {
      const parsed = JSON.parse(r.interpretation);
      if (parsed && typeof parsed === 'object') {
        // Format des-choix / des-obstacle-solution : version structurée avec 2 jeux de faces
        if ((parsed.version === 'des-choix' || parsed.version === 'des-obstacle-solution') && parsed.facesA && parsed.facesB) {
          // sera géré via cette variable en sortie
          interpData = parsed;
        } else if (parsed.static || parsed.dbInterpretation || parsed.oracleFlash || parsed.analysisGlobal || parsed.refine) {
          interpData = parsed;
          // structured = sections de l'analyse globale (compatibilité AstroView)
          if (parsed.analysisGlobal?.sections) {
            structured = { sections: parsed.analysisGlobal.sections, synthese: parsed.analysisGlobal.synthese };
          }
        } else if (parsed.sections || parsed.synthese) {
          // Format sections
          structured = parsed;
        } else if (parsed.planet || parsed.sign || parsed.house) {
          // Format clés-valeurs (global) → convertir en sections
          const sections: { kind: string; title: string; text: string }[] = [];
          if (parsed.planet) sections.push({ kind: 'planet', title: kindLabel['planet'] || 'Planète', text: parsed.planet });
          if (parsed.sign)   sections.push({ kind: 'sign',   title: kindLabel['sign'] || 'Signe',     text: parsed.sign });
          if (parsed.house)  sections.push({ kind: 'house',  title: kindLabel['house'] || 'Maison',   text: parsed.house });
          structured = { sections, synthese: parsed.synthese || '' };
        } else {
          rawInterpretation = r.interpretation;
        }
      } else {
        rawInterpretation = r.interpretation;
      }
    } catch {
      rawInterpretation = r.interpretation;
    }
  }

  // Helper pour rendre des sections d'analyse
  const renderSections = (sections: { key?: string; label?: string; text?: string }[], synthese?: string, title?: string) => (
    <div className="space-y-2 mt-3">
      {title && (
        <h4 className="text-blue-300 font-semibold text-xs mb-1" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{title}</h4>
      )}
      {sections.map((s, i) => (
        <div key={i} className="border rounded-lg p-3" style={{ borderColor: 'rgba(46,134,193,0.35)', background: 'rgba(15,45,65,0.40)' }}>
          {s.label && (
            <h4 className="font-semibold text-xs mb-1" style={{ color: '#7FB3D5', fontFamily: 'var(--font-cinzel), serif' }}>{s.label}</h4>
          )}
          <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={s.text || ''} query={query} /></p>
        </div>
      ))}
      {synthese && (
        <div className="bg-purple-950/20 border border-purple-800/30 rounded-lg p-3">
          <h4 className="text-purple-300 font-semibold text-sm mb-1 flex items-center gap-2">
            <span>📜</span>{t('readings.synthese')}
          </h4>
          <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={synthese} query={query} /></p>
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-4 space-y-3">
      {r.question && (
        <div className="bg-amber-950/15 border border-amber-700/30 rounded-lg p-3 text-center">
          <p className="text-amber-500/70 text-[10px] uppercase tracking-wide mb-1" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{t('history.yourQuestion')}</p>
          <p className="text-amber-200 italic text-sm">&quot;<Highlight text={r.question || ''} query={query} />&quot;</p>
        </div>
      )}

      {/* Cartes (dés) — masquées pour des-choix (affichées inline ci-dessous) */}
      {interpData?.version === 'des-choix' || interpData?.version === 'des-obstacle-solution' ? null : cards.length === 0 ? (
        <p className="text-gray-400 text-xs italic">{tr("Tirage sans d\u00e9tail enregistr\u00e9.", "Reading with no saved details.", "Tirada sin detalle registrado.", "\u0935\u093f\u0935\u0930\u0923-\u0930\u0939\u093f\u0924 \u0935\u093f\u0928\u094d\u092f\u093e\u0938 \u0926\u0930\u094d\u091c \u0928\u0939\u0940\u0902 \u0939\u0941\u0908\u0964")}</p>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(cards.length, 3)}, minmax(0, 1fr))` }}>
          {cards.map((c, i) => (
            <div key={i} className="flex flex-col items-center rounded-xl p-3 text-center" style={{ background: 'rgba(46,134,193,0.10)', border: '1px solid rgba(46,134,193,0.35)' }}>
              <div className="text-3xl leading-none" style={{ color: '#7FB3D5' }}>{c.value}</div>
              <div className="mt-1.5 text-[10px] uppercase tracking-widest" style={{ color: '#cfe3f5', opacity: 0.7 }}>{kindLabel[c.kind] || c.kind}</div>
              <p className="mt-1.5 text-sm font-semibold leading-snug" style={{ fontFamily: 'var(--font-cinzel), serif', color: '#cfe3f5' }}>{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Format des-choix / des-obstacle-solution : 2 sections avec tuiles inline ── */}
      {(interpData?.version === 'des-choix' || interpData?.version === 'des-obstacle-solution') && (() => {
        const isObstacle = interpData.version === 'des-obstacle-solution';
        const labelA = `═══ ${isObstacle ? t('history.block.obstacle') : t('history.block.firstChoice')} ═══`;
        const labelB = `═══ ${isObstacle ? t('history.block.solution') : t('history.block.secondChoice')} ═══`;
        const colorA = isObstacle ? '#D4A574' : '#7FB3D5';
        const colorB = isObstacle ? '#87CEEB' : '#7FB3D5';
        const facesA = interpData.facesA as Record<string, any>;
        const facesB = interpData.facesB as Record<string, any>;
        const cardA = DES_CHOIX_KINDS.map(k => ({ kind: k, value: facesA[k], label: k === 'planet' ? PLANET_NAMES[facesA[k] as string] : k === 'sign' ? SIGN_NAMES[facesA[k] as string] : `${t('history.house')} ${facesA[k]}` }));
        const cardB = DES_CHOIX_KINDS.map(k => ({ kind: k, value: facesB[k], label: k === 'planet' ? PLANET_NAMES[facesB[k] as string] : k === 'sign' ? SIGN_NAMES[facesB[k] as string] : `${t('history.house')} ${facesB[k]}` }));
        const renderDiceGrid = (items: any[]) => (
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, minmax(0, 1fr))` }}>
            {items.map((c, i) => (
              <div key={i} className="flex flex-col items-center rounded-xl p-3 text-center" style={{ background: 'rgba(46,134,193,0.10)', border: '1px solid rgba(46,134,193,0.35)' }}>
                <div className="text-3xl leading-none" style={{ color: '#7FB3D5' }}>{c.value}</div>
                <div className="mt-1.5 text-[10px] uppercase tracking-widest" style={{ color: '#cfe3f5', opacity: 0.7 }}>{kindLabel[c.kind] || c.kind}</div>
                <p className="mt-1.5 text-sm font-semibold leading-snug" style={{ fontFamily: 'var(--font-cinzel), serif', color: '#cfe3f5' }}>{c.label}</p>
              </div>
            ))}
          </div>
        );
        return (
          <>
            {/* Bloc A */}
            <div className="rounded-2xl p-4" style={{ background: isObstacle ? 'rgba(139,0,0,0.06)' : 'rgba(46,134,193,0.06)', border: isObstacle ? '1px solid rgba(139,0,0,0.3)' : '1px solid rgba(46,134,193,0.25)' }}>
              <h4 className="text-center text-base font-bold mb-3" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: colorA }}>
                {labelA}
              </h4>
              {renderDiceGrid(cardA)}
              {interpData.shortA && (
                <div className="mt-3">
                  <h5 className="text-xs font-semibold mb-1" style={{ color: '#F0E6D3', fontFamily: 'var(--font-cinzel), serif' }}>{tr("【Interprétation combinée】", "【Combined Interpretation】", "【Interpretación combinada】", "【संयुक्त व्याख्या】")}</h5>
                  <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={interpData.shortA} query={query} /></p>
                </div>
              )}
              {interpData.deepA && (
                <div className="mt-3">
                  <h5 className="text-xs font-semibold mb-1" style={{ color: '#c4a0e0', fontFamily: 'var(--font-cinzel), serif' }}>{tr("【Analyse approfondie Oracle】", "【In-depth Oracle Analysis】", "【Análisis profundo del Oráculo】", "【ओरैकल का गहन विश्लेषण】")}</h5>
                  {renderMd(interpData.deepA)}
                </div>
              )}
            </div>

            {/* Bloc B */}
            <div className="rounded-2xl p-4" style={{ background: isObstacle ? 'rgba(46,134,193,0.12)' : 'rgba(46,134,193,0.06)', border: isObstacle ? '1px solid rgba(46,134,193,0.35)' : '1px solid rgba(46,134,193,0.25)' }}>
              <h4 className="text-center text-base font-bold mb-3" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: colorB }}>
                {labelB}
              </h4>
              {renderDiceGrid(cardB)}
              {interpData.shortB && (
                <div className="mt-3">
                  <h5 className="text-xs font-semibold mb-1" style={{ color: '#F0E6D3', fontFamily: 'var(--font-cinzel), serif' }}>{tr("\u3010Interpr\u00e9tation combin\u00e9e\u3011", "\u3010Combined Interpretation\u3011", "\u3010Interpretaci\u00f3n combinada\u3011", "\u3010\u0938\u0902\u092f\u0941\u0915\u094d\u0924 \u0935\u094d\u092f\u093e\u0916\u094d\u092f\u093e\u3011")}</h5>
                  <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={interpData.shortB} query={query} /></p>
                </div>
              )}
              {interpData.deepB && (
                <div className="mt-3">
                  <h5 className="text-xs font-semibold mb-1" style={{ color: '#c4a0e0', fontFamily: 'var(--font-cinzel), serif' }}>{tr("\u3010Analyse approfondie Oracle\u3011", "\u3010In-depth Oracle Analysis\u3011", "\u3010An\u00e1lisis profundo del Or\u00e1culo\u3011", "\u3010\u0913\u0930\u0948\u0915\u0932 \u0915\u093e \u0917\u0939\u0928 \u0935\u093f\u0936\u094d\u0932\u0947\u0937\u0923\u3011")}</h5>
                  {renderMd(interpData.deepB)}
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* ── Format accumulé (affinage) ── */}
      {interpData && (
        <>
          {/* Interprétation statique */}
          {interpData.static && (
            <div className="bg-gray-800/40 rounded-lg p-3">
              <h4 className="text-blue-300 font-semibold text-xs mb-1" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{t('history.block.meaning')}</h4>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap"><Highlight text={interpData.static} query={query} /></p>
            </div>
          )}

          {/* Oracle flash */}
          {interpData.oracleFlash && (
            <div className="bg-purple-950/20 border border-purple-800/30 rounded-lg p-3">
              <h4 className="text-purple-300 font-semibold text-sm mb-1 flex items-center gap-2">
                <span>🔮</span>{t('history.block.oracleTitle')}
              </h4>
              <p className="text-gray-200 text-sm italic leading-relaxed">« <Highlight text={interpData.oracleFlash} query={query} /> »</p>
            </div>
          )}

          {/* Interprétation combinée (DB) */}
          {interpData.dbInterpretation && (
            <div className="bg-amber-950/15 border border-amber-700/30 rounded-lg p-3">
              <h4 className="text-amber-300 font-semibold text-sm mb-1 flex items-center gap-2">
                <span>📖</span>{t('history.block.combined')}
              </h4>
              <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={interpData.dbInterpretation} query={query} /></p>
            </div>
          )}

          {/* Comparaison affinage */}
          {interpData.refine && (
            <div className="bg-blue-950/20 border border-blue-800/30 rounded-lg p-3">
              <h4 className="text-blue-300 font-semibold text-sm mb-1 flex items-center gap-2">
                <span>🔎</span>
                {interpData.refine.option === 'action' ? t('history.block.refineSign') : t('history.block.refineHouse')}
              </h4>
              {interpData.refine.originalFaces && (
                <p className="text-gray-400 text-xs italic mb-2">
                  {t('history.block.initialValue')} : {interpData.refine.option === 'action'
                    ? `${interpData.refine.originalFaces.sign} → ${cards.find((c: any) => c.kind === 'sign')?.value || '?'}`
                    : `${t('history.house')} ${interpData.refine.originalFaces.house} → ${cards.find((c: any) => c.kind === 'house')?.value || '?'}`}
                </p>
              )}
            </div>
          )}

          {/* Analyse LLM globale */}
          {interpData.analysisGlobal && renderSections(
            interpData.analysisGlobal.sections || [],
            interpData.analysisGlobal.synthese || '',
            t('history.block.fullAnalysis')
          )}

          {/* Analyse LLM d'affinage */}
          {interpData.analysisRefine && renderSections(
            interpData.analysisRefine.sections || [],
            interpData.analysisRefine.synthese || '',
            t('history.block.refinedAnalysis')
          )}

          {/* Analyse LLM en texte brut (non structurée) */}
          {interpData.analysisGlobal?.texte && !interpData.analysisGlobal?.sections && (
            <div className="bg-gray-800/40 rounded-lg p-3">
              <h4 className="text-blue-300 font-semibold text-xs mb-1" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{tr("Analyse complète", "Complete analysis", "Análisis completo", "पूर्ण विश्लेषण")}</h4>
              <p className="text-gray-300 text-sm leading-relaxed"><Highlight text={interpData.analysisGlobal.texte} query={query} /></p>
            </div>
          )}
          {interpData.analysisRefine?.texte && !interpData.analysisRefine?.sections && (
            <div className="bg-gray-800/40 rounded-lg p-3">
              <h4 className="text-blue-300 font-semibold text-xs mb-1" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{tr("Analyse affinée", "Refined analysis", "Análisis afinado", "सूक्ष्म विश्लेषण")}</h4>
              <p className="text-gray-300 text-sm leading-relaxed"><Highlight text={interpData.analysisRefine.texte} query={query} /></p>
            </div>
          )}
        </>
      )}

      {/* Ancien format structuré (sans accumulateur) */}
      {!interpData && structured && (
        <div className="space-y-2 mt-3">
          {structured.synthese && (
            <div className="bg-purple-950/20 border border-purple-800/30 rounded-lg p-3">
              <h4 className="text-purple-300 font-semibold text-sm mb-1 flex items-center gap-2">
                <span>📜</span>{t('readings.synthese')}
              </h4>
              <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={structured.synthese} query={query} /></p>
            </div>
          )}
          {structured.sections?.map((s, i) => (
            <div key={i} className="border rounded-lg p-3" style={{ borderColor: 'rgba(46,134,193,0.35)', background: 'rgba(15,45,65,0.40)' }}>
              <h4 className="font-semibold text-xs mb-1" style={{ color: '#7FB3D5', fontFamily: 'var(--font-cinzel), serif' }}>{s.title || s.kind}</h4>
              <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={s.text} query={query} /></p>
            </div>
          ))}
        </div>
      )}

      {/* Fallback : interprétation texte brut (anciens tirages) */}
      {!interpData && !structured && rawInterpretation && (
        <div className="bg-gray-800/40 rounded-lg p-3">
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap"><Highlight text={rawInterpretation} query={query} /></p>
        </div>
      )}
    </div>
  );
}

function Block({ color, icon, title, text, query = '' }: { color: 'purple' | 'amber' | 'green'; icon: string; title: string; text: string; query?: string }) {
  const bg = color === 'purple' ? 'bg-purple-950/20 border-purple-800/30' : color === 'amber' ? 'bg-amber-950/20 border-amber-800/30' : 'bg-green-950/20 border-green-800/30';
  const tc = color === 'purple' ? 'text-purple-300' : color === 'amber' ? 'text-amber-300' : 'text-green-300';
  return (
    <div className={`${bg} border rounded-lg p-3`}>
      <h4 className={`${tc} font-semibold text-sm mb-2 flex items-center gap-2`}><span>{icon}</span>{title}</h4>
      <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={text} query={query} /></p>
    </div>
  );
}

// Parsers internes pour TarotView
function parseTarot3Inline(raw: string) {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === 'object' && (p.situation || p.defis || p.issue || p.carte1 || p.carte2 || p.carte3)) {
      return { kind: 'tarot3' as const, data: p };
    }
    // Nouveau format IA (passe/present/avenir/resume) → normalisé vers les
    // clés de position canoniques (situation/defis/issue) utilisées par TarotView.
    if (p && typeof p === 'object' && (p.passe !== undefined || p.present !== undefined || p.avenir !== undefined)) {
      return {
        kind: 'tarot3' as const,
        data: {
          situation: p.passe,
          defis: p.present,
          issue: p.avenir,
          resume: p.resume,
          ...p,
        },
      };
    }
  } catch {}
  return null;
}
function parseTarot5Inline(raw: string) {
  if (!raw) return null;
  try { const p = JSON.parse(raw); if (p.situation || p.defis || p.soutien || p.issue || p.conseil) return p; } catch {}
  return null;
}
