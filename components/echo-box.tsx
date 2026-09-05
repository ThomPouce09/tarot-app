'use client';

// components/echo-box.tsx
// L'Écho scellé : encadré mystérieux apparu sous l'interprétation d'une lecture
// (4 univers). Le texte reste scellé jusqu'à l'échéance (14-45 j) ; à partir de
// là, l'utilisateur le brise et rend son verdict (oui / partiel / non).
// Gating : Initié = 1 écho actif max, Arkane = illimité (le serveur tranche).

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang, useT } from '@/lib/i18n';
import { useEntitlement } from '@/lib/use-entitlement';
import { EntitlementGateModal } from '@/lib/use-entitlement';
import { api } from '@/lib/api-client';
import { RuneButton } from '@/app/runes/_shared';

export interface EchoData {
  id: string;
  readingId: string | null;
  textFr: string;
  textEn: string | null;
  domain: string;
  dueAt: string; // ISO
  verdict: string | null;
  verdictAt: string | null;
  createdAt: string;
}

function readEmail(): string {
  try {
    return JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email || '';
  } catch {
    return '';
  }
}

function sealDate(dueAt: string, lang: 'fr' | 'en'): string {
  const d = new Date(dueAt);
  return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function EchoBox({
  domain,
  readingId,
  question,
  summary,
  echo,
  onEcho,
}: {
  domain: 'tarot' | 'yi-jing' | 'runes' | 'des';
  readingId?: string | null;
  question?: string | null;
  /** Synthèse de la lecture (resume/conseil) : carburant du prompt IA. */
  summary: string;
  /** Écho déjà scellé pour cette lecture (chargé depuis /api/echo). */
  echo?: EchoData | null;
  onEcho?: (e: EchoData | null) => void;
}) {
  const lang = useLang();
  const t = useT();
  const { gateReason, closeGate } = useEntitlement();
  const [current, setCurrent] = useState<EchoData | null>(echo ?? null);
  const [sealing, setSealing] = useState(false);
  const [sealError, setSealError] = useState('');
  const [broken, setBroken] = useState(false);
  const [savingVerdict, setSavingVerdict] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (echo !== undefined) setCurrent(echo);
  }, [echo]);

  const apply = useCallback(
    (e: EchoData | null) => {
      if (!mounted.current) return;
      setCurrent(e);
      onEcho?.(e);
    },
    [onEcho],
  );

  // ── Sceau posé : sceller l'écho via l'IA ──────────────────────────
  const seal = useCallback(async () => {
    const email = readEmail();
    if (!email) return;
    setSealing(true);
    setSealError('');
    try {
      const res = await api('/api/echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: email, domain, readingId: readingId ?? null, question: question ?? null, summary }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.echo) {
        apply(data.echo);
      } else if (data.reason === 'tier' || data.reason === 'cap') {
        // Message i18n côté client (le serveur ne connaît pas la langue).
        setSealError(data.reason === 'cap' ? t('echo.cap') : t('echo.locked'));
      } else {
        // Raison 'llm' ou erreur réseau → message i18n local.
        setSealError(t('echo.sealError'));
      }
    } catch {
      setSealError(t('echo.sealError'));
    } finally {
      if (mounted.current) setSealing(false);
    }
  }, [domain, readingId, question, summary, apply, t]);

  // ── Verdict ────────────────────────────────────────────────────────
  const verdict = useCallback(
    async (v: 'oui' | 'partiel' | 'non') => {
      if (!current) return;
      const email = readEmail();
      if (!email) return;
      setSavingVerdict(true);
      try {
        const res = await api('/api/echo', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: email, echoId: current.id, verdict: v }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.echo) apply(data.echo);
      } catch {
        /* réseau — le verdict pourra être repris plus tard */
      } finally {
        if (mounted.current) setSavingVerdict(false);
      }
    },
    [current, apply],
  );

  const email = typeof window !== 'undefined' ? readEmail() : '';
  const text = current ? (lang === 'en' && current.textEn ? current.textEn : current.textFr) : '';
  const dueMs = current ? new Date(current.dueAt).getTime() : 0;
  const now = Date.now();
  const daysLeft = current ? Math.ceil((dueMs - now) / 86400000) : 0;
  const due = current && now >= dueMs;

  // ── Non connecté : on ne scelle rien (l'écho vit dans le compte) ──
  if (!email) return null;

  return (
    <div className="relative mt-8 rounded-2xl border border-amber-400/40 bg-gradient-to-b from-amber-950/30 via-black/50 to-black/60 backdrop-blur-sm overflow-hidden">
      {/* halo doré discret */}
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(217,164,6,0.25), transparent 60%)' }} />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          {/* horloge ailée (glyphe SVG inline, jamais d'emoji) */}
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v4l2.5 2.5" />
            <path d="M4 12C2.5 10.5 1.5 9 1.5 7.5 4 7.5 5.5 8.5 6.5 10M20 12c1.5-1.5 2.5-3 2.5-4.5C20 7.5 18.5 8.5 17.5 10" />
          </svg>
          <h3 className="text-amber-300 font-serif text-lg tracking-wide" style={{ fontFamily: 'var(--font-cinzel-deco), serif' }}>
            {t('echo.title')}
          </h3>
        </div>

        <AnimatePresence mode="wait">
          {/* ── État 1 : pas d'écho → proposition de sceller ── */}
          {!current && (
            <motion.div key="seal" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center">
              <p className="text-gray-200 italic text-[15px] leading-relaxed mb-4">{t('echo.tease')}</p>
              <RuneButton variant="save" onClick={seal} disabled={sealing}>
                {sealing ? t('echo.sealing') : t('echo.seal')}
              </RuneButton>
              {sealError && <p className="mt-3 text-sm text-red-300/90">{sealError}</p>}
            </motion.div>
          )}

          {/* ── État 2 : scellé, échéance pas encore atteinte ── */}
          {current && !due && !broken && (
            <motion.div key="sealed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
              <div className="mx-auto mb-3 w-16 h-16 rounded-full border border-amber-400/50 bg-gradient-to-b from-amber-500/25 to-black/40 flex items-center justify-center shadow-[0_0_24px_rgba(217,164,6,0.35)]">
                {/* sceau : rune + boucle */}
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-amber-300" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
                  <path d="M6 3v18M6 6l12-3M6 12l12-6M6 18l12-6" />
                </svg>
              </div>
              <p className="text-amber-100/90 text-[15px] leading-relaxed">
                {t('echo.sealedLine').replace('{date}', sealDate(current.dueAt, lang))}
              </p>
              <p className="mt-1 text-xs text-gray-400">{t('echo.daysLeft').replace('{n}', String(Math.max(0, daysLeft)))}</p>
            </motion.div>
          )}

          {/* ── État 3 : échéance atteinte → briser le sceau / verdict ── */}
          {current && due && (
            <motion.div key="due" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {!broken && !current.verdict && (
                <div className="text-center">
                  <p className="text-amber-100/90 text-[15px] leading-relaxed mb-4">{t('echo.dueNow')}</p>
                  <RuneButton variant="save" onClick={() => setBroken(true)}>
                    {t('echo.break')}
                  </RuneButton>
                </div>
              )}
              {(broken || current.verdict) && (
                <div className="text-center">
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9 }}
                    className="text-amber-100 italic text-[16px] sm:text-[17px] leading-relaxed"
                    style={{ fontFamily: 'var(--font-cinzel), serif' }}
                  >
                    « {text} »
                  </motion.p>
                  {current.verdict ? (
                    <p className="mt-4 text-sm text-emerald-300/90">
                      {t('echo.verdictRecorded').replace('{v}', t(`echo.verdict.${current.verdict}`))}
                    </p>
                  ) : (
                    <div className="mt-5">
                      <p className="text-sm text-gray-300 mb-3">{t('echo.verdictAsk')}</p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        {(['oui', 'partiel', 'non'] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            disabled={savingVerdict}
                            onClick={() => verdict(v)}
                            className="rounded-full px-5 py-2 text-sm font-bold border border-amber-400/50 text-amber-100 bg-black/40 hover:bg-amber-900/40 transition-colors disabled:opacity-50"
                            style={{ fontFamily: 'var(--font-cinzel), serif' }}
                          >
                            {t(`echo.verdict.${v}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <EntitlementGateModal reason={gateReason} onClose={closeGate} />
    </div>
  );
}
