'use client';

// components/space-tour.tsx — Visite interactive de « Mon espace » (1re visite).
// 3 gestes RÉELS exigés (clic sur le bandeau de sortie, sur le médaillon, sur un
// bouton de rubrique) : chaque clic est intercepté en phase de capture, donc la
// visite reste toujours sur /dashboard/account. Halo doré sur la cible, voile
// autour (bandes qui mangent les autres clics), bulle explicative, son discret
// à chaque réussite, carte de validation. Drapeau lié au compte ('login_tour',
// base Neon) — rejouable via Préférences > « Revoir le tutoriel ».

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { playSound } from '@/lib/sounds';
import { useT } from '@/lib/i18n';
import { isTutorialSeen, markTutorialSeen, hydrateTutorials, TUTS_EVENT } from '@/lib/tutorials';

const FLAG = 'login_tour';
const PAD = 6;

interface TourStep {
  /** Sélecteur dont le clic (intercepté) fait avancer la visite. */
  selector: string;
  /** Sélecteur à entourer du halo (défaut : selector). */
  ringSel?: string;
  /** Halo en pilule (médaillon rond). */
  pill?: boolean;
  titleKey: string;
  bodyKey: string;
}

const STEPS: TourStep[] = [
  { selector: '[data-tour="home"]', titleKey: 'spaceTour.s1.title', bodyKey: 'spaceTour.s1.body' },
  { selector: '[data-tour="avatar"]', pill: true, titleKey: 'spaceTour.s2.title', bodyKey: 'spaceTour.s2.body' },
  { selector: '[data-tour="navitem"]', ringSel: '[data-tour="nav"]', titleKey: 'spaceTour.s3.title', bodyKey: 'spaceTour.s3.body' },
];

function firstVisibleRect(sel: string): DOMRect | null {
  for (const el of Array.from(document.querySelectorAll(sel))) {
    const h = el as HTMLElement;
    const cs = getComputedStyle(h);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = h.getBoundingClientRect();
    if (r.width > 8 && r.height > 8) return r;
  }
  return null;
}

export default function SpaceTour({ active = true }: { active?: boolean }) {
  const t = useT();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [phase, setPhase] = useState<'wait' | 'show' | 'done'>('wait');
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // La visite ne court que sur la page par défaut de Mon espace, une fois par
  // compte, et seulement quand le compte est confirmé (sinon la modale de
  // cantonnement email recouvrirait tout).
  useEffect(() => {
    if (!active || pathname !== '/dashboard/account') { setPending(false); return; }
    let stop = false;
    const check = () => hydrateTutorials().then(() => { if (!stop) setPending(!isTutorialSeen(FLAG)); });
    check();
    window.addEventListener(TUTS_EVENT, check);
    return () => { stop = true; window.removeEventListener(TUTS_EVENT, check); };
  }, [active, pathname]);

  // Attend la fin des overlays prioritaires (portail langue, hall des Etoiles)
  // et la présence de la première cible.
  useEffect(() => {
    if (!pending) return;
    setPhase('wait');
    setIdx(0);
    let stop = false;
    const poll = () => {
      if (stop) return;
      const busy = document.querySelector('[data-lang-gate]') || document.querySelector('[data-tour="hall"]');
      if (!busy && firstVisibleRect(STEPS[0].selector)) setPhase('show');
      else setTimeout(poll, 450);
    };
    poll();
    return () => { stop = true; };
  }, [pending]);

  const step = STEPS[idx];

  // Suit la cible (scroll / resize).
  const measure = useCallback(() => {
    if (phase !== 'show') { setRect(null); return; }
    setRect(firstVisibleRect(step.ringSel || step.selector));
  }, [phase, step]);

  useEffect(() => {
    if (phase !== 'show') return;
    measure();
    const onMove = () => requestAnimationFrame(measure);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => { window.removeEventListener('scroll', onMove, true); window.removeEventListener('resize', onMove); };
  }, [phase, measure]);

  // Clic forcé sur la cible : capture AVANT les gestionnaires (y compris React),
  // on coupe court à la navigation — la visite reste sur la page.
  const advance = useCallback(() => {
    playSound('scroll1', 0.35);
    setIdx((i) => {
      if (i + 1 >= STEPS.length) { setPhase('done'); playSound('seal', 0.4); return i; }
      return i + 1;
    });
  }, []);

  useEffect(() => {
    if (phase !== 'show') return;
    const sel = STEPS[idx].selector;
    const onCapture = (e: Event) => {
      const target = e.target as Element | null;
      if (target?.closest?.(sel)) { e.preventDefault(); e.stopPropagation(); advance(); }
    };
    document.addEventListener('click', onCapture, true);
    return () => document.removeEventListener('click', onCapture, true);
  }, [phase, idx, advance]);

  const finish = useCallback(() => {
    markTutorialSeen(FLAG);
    setPending(false);
  }, []);

  if (!pending || phase === 'wait') return null;

  // ── Carte de validation (dernière étape, aucun ciblage nécessaire) ──
  if (phase === 'done') {
    return (
      <div className="fixed inset-0 z-[9500] flex items-center justify-center px-5" style={{ background: 'rgba(4,2,10,0.72)' }}>
        <div className="w-full max-w-sm rounded-2xl px-6 py-6 text-center" style={{ background: 'rgba(38,20,12,0.98)', border: '1px solid rgba(218,165,32,0.55)', boxShadow: '0 10px 40px rgba(0,0,0,0.7), 0 0 24px rgba(218,165,32,0.18)' }}>
          <span aria-hidden className="text-2xl" style={{ color: '#DAA520' }}>✦</span>
          <h2 className="mt-1 text-lg font-bold" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#F5EAD6' }}>{t('spaceTour.done.title')}</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed" style={{ fontFamily: 'var(--font-cinzel), serif', color: 'rgba(245,234,214,0.85)' }}>{t('spaceTour.done.body')}</p>
          <button type="button" onClick={finish} className="mt-4 w-full rounded-full py-2 text-[13px] font-bold" style={{ background: 'linear-gradient(180deg,#e8c56a,#c9971f)', color: '#2b1608', boxShadow: '0 0 12px rgba(218,165,32,0.4), inset 0 1px 0 rgba(255,255,255,0.45)', fontFamily: 'var(--font-cinzel), serif' }}>
            {t('spaceTour.done.cta')}
          </button>
        </div>
      </div>
    );
  }

  if (!rect) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const hole = { x: Math.max(0, rect.left - PAD), y: Math.max(0, rect.top - PAD), w: Math.min(vw, rect.width + PAD * 2), h: Math.min(vh, rect.height + PAD * 2) };
  // Voile = 4 bandes autour du trou (le trou reste cliquable pour la cible).
  const bands = [
    { left: 0, top: 0, width: vw, height: hole.y },
    { left: 0, top: hole.y + hole.h, width: vw, height: Math.max(0, vh - hole.y - hole.h) },
    { left: 0, top: hole.y, width: hole.x, height: hole.h },
    { left: hole.x + hole.w, top: hole.y, width: Math.max(0, vw - hole.x - hole.w), height: hole.h },
  ];
  const dim = 'rgba(4,2,10,0.66)';

  // Bulle : sous la cible si elle est en haut, au-dessus si elle est en bas.
  const bubbleBelow = hole.y < vh / 2;
  const bubbleStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9502,
    width: 300,
    maxWidth: '86vw',
    left: Math.max(10, Math.min(hole.x + hole.w / 2 - 150, vw - Math.min(310, vw - 10))),
    ...(bubbleBelow ? { top: hole.y + hole.h + 14 } : { bottom: Math.max(14, vh - hole.y + 14) }),
  };

  return (
    <>
      {bands.map((b, i) => (
        <div key={i} aria-hidden onClick={(e) => e.preventDefault()} style={{ position: 'fixed', zIndex: 9500, background: dim, pointerEvents: 'auto', ...b }} />
      ))}
      <div
        aria-hidden
        className="space-tour-ring"
        style={{ position: 'fixed', zIndex: 9501, pointerEvents: 'none', top: hole.y, left: hole.x, width: hole.w, height: hole.h, borderRadius: step.pill ? 999 : 14 }}
      />
      <div style={{ ...bubbleStyle, fontFamily: 'var(--font-cinzel), serif' }}>
        <div className="rounded-xl px-4 py-3.5" style={{ background: 'rgba(38,20,12,0.97)', border: '1px solid rgba(218,165,32,0.55)', boxShadow: '0 8px 28px rgba(0,0,0,0.6), 0 0 18px rgba(218,165,32,0.18)' }}>
          <p className="text-[12.5px] font-bold" style={{ color: '#DAA520' }}>{t(step.titleKey)}</p>
          <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: '#F5EAD6' }}>{t(step.bodyKey)}</p>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[10px]" style={{ color: 'rgba(245,234,214,0.55)' }}>{idx + 1} / {STEPS.length}</span>
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); playSound('scroll1', 0.3); finish(); }} className="text-[11px] underline underline-offset-2" style={{ color: 'rgba(232,197,106,0.8)' }}>
              {t('spaceTour.skip')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
