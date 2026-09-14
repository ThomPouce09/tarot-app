'use client';

// ═══════════════════════════════════════════════════════════════════
// PROTOTYPE JOUABLE — « Le Double Hexagramme » (/yi-jing-double)
// Non référencé dans les hubs : test de jouabilité uniquement.
//
// Le tirage orthodoxe de la transformation (zhi gua, cœur du Zhou Yi) :
// les 6 lignes tirées à l'achillée contiennent 1 à 3 lignes mutantes
// (vieux yang / vieux yin). L'animation fait ONDULER ces lignes, qui
// finissent par se RETOURNER : l'hexagramme présent accouche en direct
// de son hexagramme futur. L'oracle lit la PAIRE (situation → évolution)
// et annonce une échéance → l'augure sera scellée.
// Données : lib/yj-hexagrams.json (table complète 64 numéros — source statique,
// bits base→sommet) + /api/hexagram/[numero] (textes roi Wen réels).
// ═══════════════════════════════════════════════════════════════════

import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/lib/i18n';
import { YI_LACQUER } from '../yi-jing-simplifie/theme-selector';
import HEX from '@/lib/yj-hexagrams.json';
import { api } from '@/lib/api-client';

type HexRow = { c: string; b: string };
const BY_BITS: Record<string, number> = {};
for (const [n, h] of Object.entries(HEX as Record<string, HexRow>)) BY_BITS[h.b] = Number(n);

const GOLD = YI_LACQUER.gold;
const LILAC = YI_LACQUER.lilac;

/* Une ligne (yao) : trait plein = yang, trait brisé = yin. */
function Yao({ yang, mutating, phase }: { yang: boolean; mutating: boolean; phase: 'still' | 'wave' | 'done' }) {
  const color = mutating && phase === 'wave' ? '#FF6B5E' : GOLD;
  const bar = (
    <div
      className="h-[10px] rounded-sm"
      style={{
        background: color,
        boxShadow: mutating ? `0 0 12px ${color}` : `0 0 6px rgba(243,201,105,0.35)`,
        opacity: mutating ? 1 : 0.92,
      }}
    />
  );
  return (
    <motion.div
      animate={mutating && phase === 'wave' ? { scaleY: [1, 1.35, 0.9, 1.25, 1], rotateZ: [0, -1.6, 1.6, -0.8, 0] } : { scaleY: 1, rotateZ: 0 }}
      transition={mutating && phase === 'wave' ? { duration: 1.1, repeat: Infinity } : { duration: 0.4 }}
      className="flex w-40 items-center justify-center gap-3 sm:w-52"
    >
      {yang ? (
        bar
      ) : (
        <div className="flex w-full items-center justify-between">
          <div className="w-[38%]">{bar}</div>
          <div className="w-[38%]">{bar}</div>
        </div>
      )}
      {mutating && (
        <span className="absolute -right-1 text-[10px]" style={{ color: phase === 'done' ? GOLD : '#FF6B5E' }}>
          {phase === 'done' ? '✦' : '◌'}
        </span>
      )}
    </motion.div>
  );
}

function HexagramColumn({ lignes, mutating, phase }: { lignes: number[]; mutating: Set<number>; phase: 'still' | 'wave' | 'done' }) {
  // lignes = base→sommet ; l'affichage va du sommet (haut) vers la base.
  return (
    <div className="relative flex flex-col-reverse items-center gap-2.5">
      {lignes.map((v, i) => (
        <div key={i} className="relative">
          <Yao yang={v === 1} mutating={mutating.has(i)} phase={phase} />
        </div>
      ))}
    </div>
  );
}

function HexLabel({ numero, tag, lang, c }: { numero: number | null; tag: string; lang: 'fr' | 'en'; c?: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: `${GOLD}99` }}>{tag}</p>
      <p className="mt-1 font-[family-name:var(--font-cinzel-deco)] text-2xl" style={{ color: GOLD }}>
        {numero ? `#${numero}` : '…'} {c && <span className="ml-1">{c}</span>}
      </p>
      <p className="text-[11px] italic" style={{ color: LILAC, opacity: 0.8 }}>
        {numero ? (lang === 'en' ? 'hexagram read via /api/hexagram' : 'lecture via /api/hexagram') : ''}
      </p>
    </div>
  );
}

export default function PrototypeYiJingDouble() {
  const lang = useLang();
  const [lignes, setLignes] = useState<number[] | null>(null);
  const [mutating, setMutating] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<'idle' | 'still' | 'wave' | 'done'>('idle');
  const [cast, setCast] = useState(0);
  const [reading, setReading] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const { hexPresent, hexFutur } = useMemo(() => {
    if (!lignes) return { hexPresent: null as number | null, hexFutur: null as number | null };
    const bitsP = lignes.map((v) => (v === 8 || v === 6 ? 0 : 1)).join('');
    const fut = lignes.map((v, i) => {
      const yang = v === 7 || v === 9 ? 1 : 0;
      return mutating.has(i) ? 1 - yang : yang;
    });
    return { hexPresent: BY_BITS[bitsP] ?? null, hexFutur: BY_BITS[fut.join('')] ?? null };
  }, [lignes, mutating]);

  const drawYarrow = useCallback(() => {
    // Rituels des 49 tiges simplifié : probabilités canoniques
    // 6 (vieux yin, mutant) 1/16 · 7 (jeune yang) 5/16 · 8 (jeune yin) 7/16 · 9 (vieux yang, mutant) 3/16.
    const roll = () => { const x = Math.random() * 16; return x < 1 ? 6 : x < 6 ? 7 : x < 13 ? 8 : 9; };
    const ls = Array.from({ length: 6 }, () => roll());
    setLignes(ls);
    setMutating(new Set(ls.map((v, i) => (v === 6 || v === 9 ? i : -1)).filter((i) => i >= 0)));
    setPhase('still');
    setReading(null); setError(false); setCast((c) => c + 1);
    // mutation visible après un temps de stable
    window.setTimeout(() => setPhase('wave'), 1200);
    window.setTimeout(() => setPhase('done'), 4600);
  }, []);

  const askPair = async () => {
    if (!hexPresent || !hexFutur) return;
    setLoading(true); setError(false); setReading(null);
    try {
      const [a, b] = await Promise.all([
        api(`/api/hexagram/${hexPresent}`).then((r) => r.json()),
        api(`/api/hexagram/${hexFutur}`).then((r) => r.json()),
      ]);
      const nomA = a.hexagram?.name || `#${hexPresent}`;
      const nomB = b.hexagram?.name || `#${hexFutur}`;
      const syA = a.hexagram?.synthese || '';
      const syB = b.hexagram?.synthese || '';
      const res = await api('/api/prototype-interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'prototype',
          prompt: `Tu es un maître du Yi Jing. Situation présente : hexagramme ${hexPresent} « ${nomA} » — ${syA}. En quoi elle se transforme (lignes mutantes ${[...mutating].map((i) => i + 1).join(', ') || 'aucune'}) : hexagramme ${hexFutur} « ${nomB} » — ${syB}. ${lang === 'en' ? 'In English' : 'En français'}, en 4 phrases maximum : 1) ce que la situation est maintenant, 2) la ligne mutante comme point de bascule, 3) la direction du changement, 4) un conseil concret et une échéance approximative (en jours) pour observer le retournement.`,
        }),
      });
      if (!res.ok) throw new Error('http');
      const data = await res.json();
      const txt = String(data.text || '').trim();
      if (!txt) throw new Error('empty');
      setReading(txt);
    } catch { setError(true); } finally { setLoading(false); }
  };

  const presentYang = useMemo(
    () => (lignes ? lignes.map((v) => (v === 7 || v === 9 ? 1 : 0)) : null),
    [lignes]
  );
  const futureYang = useMemo(
    () => (lignes ? lignes.map((v, i) => { const y = v === 7 || v === 9 ? 1 : 0; return mutating.has(i) ? 1 - y : y; }) : null),
    [lignes, mutating]
  );

  return (
    <div className="relative min-h-screen select-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${YI_LACQUER.panelTop} 0%, ${YI_LACQUER.panelMid} 55%, ${YI_LACQUER.panelDeep} 100%)` }}>
      <div className="relative z-10 mx-auto max-w-2xl px-4 pb-24 pt-14">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: `${GOLD}99` }}>✦ prototype ✦</p>
          <h1 className="mt-1 font-[family-name:var(--font-cinzel-deco)] text-3xl" style={{ color: GOLD, textShadow: '0 0 30px rgba(243,201,105,0.35)' }}>
            {lang === 'en' ? 'The Double Hexagram' : 'Le Double Hexagramme'}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-xs italic leading-relaxed" style={{ color: LILAC, opacity: 0.8 }}>
            {lang === 'en'
              ? 'Six yarrow stalks draw the present hexagram. The moving lines — old yang, old yin — ripple, then flip : the situation gives birth, before your eyes, to the hexagram it is becoming.'
              : 'Six tiges d’achillée tirent l’hexagramme présent. Les lignes mutantes — vieux yang, vieux yin — ondulent puis se retournent : la situation enfante sous tes yeux l’hexagramme en quoi elle se transforme.'}
          </p>
          <p className="mt-1 text-[10px] tracking-widest" style={{ color: `${GOLD}88` }}>
            zhi gua · {lang === 'en' ? 'the transformation casting' : 'le tirage du changement'} · « {lang === 'en' ? 'permanence of change' : 'seule la permanence du changement est permanente'} »
          </p>
        </div>

        {phase === 'idle' && (
          <div className="mt-14 text-center">
            <motion.button
              type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={drawYarrow}
              className="rounded-full px-8 py-3 font-[family-name:var(--font-cinzel-deco)] text-sm font-bold uppercase tracking-widest"
              style={{
                background: `linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%), #8E1C22`,
                color: GOLD, border: `1.5px solid ${GOLD}`, boxShadow: '0 0 22px rgba(243,201,105,0.3), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -3px 7px rgba(0,0,0,0.45)',
              }}
            >
              {lang === 'en' ? 'Shake the 49 stalks' : 'Secouer les 49 tiges'}
            </motion.button>
          </div>
        )}

        {presentYang && futureYang && (
          <div key={cast} className="mt-10 flex items-center justify-center gap-6 sm:gap-14">
            <div className="flex flex-col items-center gap-3">
              <HexLabel numero={hexPresent} tag={lang === 'en' ? 'Present' : 'Présent'} lang={lang === 'fr' ? 'fr' : 'en'} c={hexPresent ? (HEX as Record<string, HexRow>)[String(hexPresent)]?.c : ''} />
              <HexagramColumn lignes={presentYang} mutating={mutating} phase={phase === 'done' ? 'done' : phase === 'wave' ? 'wave' : 'still'} />
              <p className="text-[10px]" style={{ color: `${GOLD}aa` }}>
                {mutating.size ? `${lang === 'en' ? 'moving lines' : 'lignes mutantes'} : ${[...mutating].map((i) => i + 1).join('·')}` : lang === 'en' ? 'no moving line — stable situation' : 'aucune ligne mutante — situation stable'}
              </p>
            </div>
            <AnimatePresence>
              {(phase === 'wave' || phase === 'done') && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7, rotateY: -90 }} animate={{ opacity: 1, scale: 1, rotateY: 0 }} transition={{ duration: 1.0, ease: 'easeOut' }}
                  className="flex flex-col items-center gap-3"
                >
                  <HexLabel numero={hexFutur} tag={lang === 'en' ? 'Becoming' : 'En devenir'} lang={lang === 'fr' ? 'fr' : 'en'} c={hexFutur ? (HEX as Record<string, HexRow>)[String(hexFutur)]?.c : ''} />
                  <HexagramColumn lignes={futureYang} mutating={new Set()} phase="done" />
                  <p className="text-[10px]" style={{ color: `${GOLD}aa` }}>{phase === 'done' ? (lang === 'en' ? 'the new hexagram stands' : 'le nouvel hexagramme est posé') : '…'}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {phase === 'done' && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-10 max-w-xl">
            <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(160deg, rgba(142,28,34,0.22) 0%, rgba(10,5,7,0.9) 100%)', border: `1.5px solid ${GOLD}55`, boxShadow: '0 0 30px rgba(0,0,0,0.6)' }}>
              <h3 className="text-center font-[family-name:var(--font-cinzel-deco)] text-base" style={{ color: GOLD }}>
                {lang === 'en' ? 'Reading of the pair' : 'Lecture de la paire'}
              </h3>
              {!reading && !loading && !error && (
                <div className="mt-4 text-center">
                  <motion.button type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={askPair}
                    className="rounded-full px-7 py-2.5 font-[family-name:var(--font-cinzel-deco)] text-xs font-bold uppercase tracking-widest"
                    style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%), #005f6a', color: '#fff', boxShadow: '0 0 16px rgba(0,95,106,0.5), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -3px 7px rgba(0,0,0,0.35)' }}>
                    {lang === 'en' ? 'Oracle on the pair' : 'Oracle sur la paire'}
                  </motion.button>
                  <p className="mt-2 text-[10px]" style={{ color: `${LILAC}88` }}>→ {lang === 'en' ? 'then seal the augury on the announced date' : 'puis scelle l’augure sur l’échéance annoncée'}</p>
                </div>
              )}
              {loading && <p className="mt-4 text-center text-xs italic" style={{ color: LILAC, opacity: 0.7 }}>{lang === 'en' ? 'The two hexagrams converse…' : 'Les deux hexagrammes conversent…'}</p>}
              {error && (
                <div className="mt-4 text-center">
                  <p className="text-xs italic" style={{ color: '#c9b28a' }}>{lang === 'en' ? 'The oracle is silent — retry.' : 'L’oracle se tait — réessaie.'}</p>
                  <button onClick={askPair} className="mt-1 text-xs underline" style={{ color: GOLD }}>{lang === 'en' ? 'Retry' : 'Relancer'}</button>
                </div>
              )}
              {reading && <p className="mt-3 text-center text-sm leading-relaxed italic" style={{ color: LILAC, fontFamily: 'var(--font-cinzel), serif' }}>« {reading} »</p>}
            </div>
            <div className="mt-4 text-center">
              <button onClick={drawYarrow} className="text-[11px] underline" style={{ color: `${GOLD}aa` }}>
                ↻ {lang === 'en' ? 'consult again (demo)' : 'reconsulter (démo)'}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
