'use client';

// app/dashboard/account/echoes/page.tsx
// Le Grimoire des Échos — registre de toutes les prémonctions scellées
// (tarot, Yi Jing, runes, dés). Réservé aux Arkanes (étape 10) ; les autres
// niveaux voient un vérouillage doux vers l'abonnement. Les échos échus
// peuvent être brisés et jugés ici même (verdict oui / en partie / non).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLang, useT } from '@/lib/i18n';
import { useEntitlement } from '@/lib/use-entitlement';
import { RuneButton } from '@/app/runes/_shared';
import type { EchoData } from '@/components/echo-box';

function readEmail(): string {
  try {
    return JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email || '';
  } catch {
    return '';
  }
}

const DOMAIN_ICON: Record<string, string> = {
  tarot: '/images/tarot-icon.png',
  'yi-jing': '/images/yi-jing-icon.png',
  runes: '/images/runes-icon.png',
  des: '/images/des-zodiaque.png',
};

function fmtDate(iso: string, lang: 'fr' | 'en'): string {
  return new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function GrimoirePage() {
  const t = useT();
  const lang = useLang();
  const { sub, loaded } = useEntitlement();
  const [echoes, setEchoes] = useState<EchoData[] | null>(null);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  const email = typeof window !== 'undefined' ? readEmail() : '';
  const isArkane = sub?.level === 'arkane';

  useEffect(() => {
    if (!email || !isArkane) return;
    fetch(`/api/echo?userId=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((d) => setEchoes(d.echoes || []))
      .catch(() => setEchoes([]));
  }, [email, isArkane]);

  const verdict = useCallback(
    async (e: EchoData, v: 'oui' | 'partiel' | 'non') => {
      setSavingId(e.id);
      try {
        const res = await fetch('/api/echo', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: email, echoId: e.id, verdict: v }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.echo) {
          setEchoes((prev) => (prev || []).map((x) => (x.id === e.id ? data.echo : x)));
        }
      } catch {
        /* réseau — le verdict pourra être repris plus tard */
      } finally {
        setSavingId(null);
      }
    },
    [email],
  );

  const now = Date.now();
  const pending = (echoes || []).filter((e) => !e.verdict);
  const closed = (echoes || []).filter((e) => e.verdict);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mystic-title text-2xl sm:text-3xl flex items-center gap-2">
          <span className="text-2xl" aria-hidden>📖</span>
          {t('echo.grimoire')}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{t('echo.grimoireSub')}</p>
      </header>

      {/* ── Verrou : le Grimoire est la prérogative des Arkanes ── */}
      {loaded && !isArkane ? (
        <div className="mystic-panel p-8 text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full border border-amber-400/40 bg-gradient-to-b from-amber-500/20 to-black/40 flex items-center justify-center shadow-[0_0_28px_rgba(217,164,6,0.3)]">
            <span className="text-4xl" aria-hidden>🔒</span>
          </div>
          <p className="text-amber-100/90 text-[15px] leading-relaxed max-w-md mx-auto">
            {t('echo.grimoireLocked')}
          </p>
          <div className="mt-6">
            <Link href="/dashboard/account/abonnement">
              <RuneButton variant="save">{t('echo.grimoireCta')}</RuneButton>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* ── Échos en attente ── */}
          <div className="mystic-panel p-5">
            <h2 className="mystic-subtitle text-sm mb-4">🕐 {t('echo.grimoirePending')}</h2>
            {echoes === null ? (
              <p className="text-gray-500 text-sm italic">{t('echo.sealing')}</p>
            ) : pending.length === 0 ? (
              <p className="text-gray-500 text-sm italic">{t('echo.grimoireEmpty')}</p>
            ) : (
              <div className="space-y-3">
                {pending.map((e) => {
                  const due = new Date(e.dueAt).getTime() <= now;
                  const revealed = due && brokenIds.has(e.id);
                  return (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border p-4"
                      style={{
                        borderColor: due ? 'rgba(218,165,32,0.5)' : 'rgba(0,95,106,0.4)',
                        background: due ? 'rgba(218,165,32,0.06)' : 'rgba(0,95,106,0.06)',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <img src={DOMAIN_ICON[e.domain] || DOMAIN_ICON.tarot} alt="" className="w-6 h-6 object-contain" />
                        <span className="text-xs text-gray-400">{t(`echo.domain.${e.domain}`)}</span>
                        <span className="ml-auto text-xs text-gray-400">
                          {fmtDate(e.dueAt, lang)}
                        </span>
                      </div>
                      {revealed ? (
                        <div className="text-center">
                          <p className="text-amber-100 italic text-[15px] leading-relaxed"
                             style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                            « {lang === 'en' && e.textEn ? e.textEn : e.textFr} »
                          </p>
                          <p className="text-sm text-gray-300 mt-3 mb-2">{t('echo.verdictAsk')}</p>
                          <div className="flex flex-wrap items-center justify-center gap-3">
                            {(['oui', 'partiel', 'non'] as const).map((v) => (
                              <button
                                key={v}
                                type="button"
                                disabled={savingId === e.id}
                                onClick={() => verdict(e, v)}
                                className="rounded-full px-5 py-2 text-sm font-bold border border-amber-400/50 text-amber-100 bg-black/40 hover:bg-amber-900/40 transition-colors disabled:opacity-50"
                                style={{ fontFamily: 'var(--font-cinzel), serif' }}
                              >
                                {t(`echo.verdict.${v}`)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : due ? (
                        <div className="text-center">
                          <p className="text-amber-100/90 text-[14px] mb-3">{t('echo.dueNow')}</p>
                          <RuneButton variant="save" onClick={() => setBrokenIds((s) => new Set(s).add(e.id))}>
                            {t('echo.break')}
                          </RuneButton>
                        </div>
                      ) : (
                        <p className="text-[14px]" style={{ color: '#4db8c4' }}>
                          {t('echo.sealedLine').replace('{date}', fmtDate(e.dueAt, lang))}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Échos clos ── */}
          {closed.length > 0 && (
            <div className="mystic-panel p-5">
              <h2 className="mystic-subtitle text-sm mb-4">✶ {t('echo.grimoireClosed')}</h2>
              <div className="space-y-3">
                {closed.map((e) => (
                  <div key={e.id} className="rounded-xl border border-amber-400/20 bg-black/30 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <img src={DOMAIN_ICON[e.domain] || DOMAIN_ICON.tarot} alt="" className="w-6 h-6 object-contain opacity-70" />
                      <span className="text-xs text-gray-400">{t(`echo.domain.${e.domain}`)}</span>
                      <span className="ml-auto text-xs" style={{ color: '#b8963e' }}>
                        {t('echo.verdictRecorded').replace('{v}', t(`echo.verdict.${e.verdict || 'non'}`))}
                      </span>
                    </div>
                    <p className="text-gray-300 italic text-[14px] leading-relaxed">
                      « {lang === 'en' && e.textEn ? e.textEn : e.textFr} »
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
