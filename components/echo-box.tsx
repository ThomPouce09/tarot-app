'use client';

// components/echo-box.tsx
// L'Augure scellé : encadré mystérieux apparu sous l'interprétation d'une lecture
// (4 univers). Le texte reste scellé jusqu'à l'échéance (14-45 j) ; à partir de
// là, l'utilisateur le brise et rend son verdict (oui / partiel / non).
// Gating : Initié = 2 augures actifs max, Arkane = illimité (le serveur tranche).

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang, useT, contentLang } from '@/lib/i18n';
import { pickEchoText } from '@/lib/i18n/echo-text';
import { useEntitlement } from '@/lib/use-entitlement';
import { EntitlementGateModal } from '@/lib/use-entitlement';
import { api } from '@/lib/api-client';
import { RuneButton } from '@/app/runes/_shared';
import { playSound } from '@/lib/sounds';
import { api } from '@/lib/api-client';
import { useFitOneLine } from '@/lib/fit-one-line';

export interface EchoData {
  id: string;
  readingId: string | null;
  textFr: string;
  textEn: string | null;
  // Parallèles ES/HI (sérialisées par l'API depuis la v-i18n ; optionnelles
  // pour ne pas casser les anciens constructeurs côté client).
  textEs?: string | null;
  textHi?: string | null;
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

function sealDate(dueAt: string, lang: string): string {
  const d = new Date(dueAt);
  return d.toLocaleDateString(({ fr: 'fr-FR', en: 'en-GB', es: 'es-ES', hi: 'hi-IN' } as Record<string, string>)[lang] ?? 'fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function EchoBox({
  domain,
  moss = false,
  readingId,
  question,
  summary,
  echo,
  onEcho,
}: {
  domain: 'tarot' | 'yi-jing' | 'runes' | 'des';
  /** /runes/yggdrasil : encadré vert forêt + sceau cèdre (harmonie runes). */
  moss?: boolean;
  readingId?: string | null;
  question?: string | null;
  /** Synthèse de la lecture (resume/conseil) : carburant du prompt IA. */
  summary: string;
  /** Augure déjà scellé pour cette lecture (chargé depuis /api/echo). */
  echo?: EchoData | null;
  onEcho?: (e: EchoData | null) => void;
}) {
  const lang = useLang();
  const t = useT();
  // Le titre « Envie de défier l'Oracle ? » tient sur UNE ligne à toute
  // largeur (police réduite au besoin, jamais de retour à la ligne).
  const titleRef = useRef<HTMLHeadingElement>(null);
  useFitOneLine(titleRef, [t('echo.title'), lang], { base: 18, min: 11, max: 22, inset: 4, font: '700 18px "Cinzel"' });
  const { sub, gateReason, closeGate, reload } = useEntitlement();
  // Initié à court de places : le serveur refuse (403 'cap') et l'UI doit
  // ne le lui rappelle plus — la boîte de scellement est INVISIBLE tant qu'aucune
  // place n'est libre (juger ou supprimer un augure non brisé en rend une ;
  // le compteur serveur ne compte que les augures sans verdict).
  const echoSlotsExhausted = !!sub && sub.level === 'initie' && sub.usage?.auguriesRemaining === 0;
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

  // Les pages dés/tarot/yi-jing ne passent pas la prop `echo` : sans ce
  // chargement, la boîte propose de « Sceller » une lecture QUI A DÉJÀ SON
  // AUGURE — le clic semblait réussir sans rien créer (dédup serveur) ni
  // prévenir. On récupère l'augure de cette lecture au montage : le sceau
  // existant s'affiche directement, le faux bouton par disparaît.
  useEffect(() => {
    if (echo !== undefined || !readingId) return;
    const email = readEmail();
    if (!email) return;
    let alive = true;
    api(`/api/echo?userId=${encodeURIComponent(email)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const mine = (d?.echoes as EchoData[] | undefined)?.find((e) => e.readingId === readingId);
        if (alive && mine) setCurrent(mine);
      })
      .catch(() => { /* réseau — le POST dédupliquera de toute façon */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingId]);

  const apply = useCallback(
    (e: EchoData | null) => {
      if (!mounted.current) return;
      setCurrent(e);
      onEcho?.(e);
    },
    [onEcho],
  );

  // ── Sceau posé : sceller l'augure via l'IA ──────────────────────────
  const seal = useCallback(async () => {
    const email = readEmail();
    if (!email) return;
    // Dés zodiacaux : clic = « seal-astro-click », acte = « seal-astro ».
    // Ailleurs : enclume au clic, sceau à l'acte (comme avant).
    if (domain === 'des') playSound('seal-astro-click', 0.95);
    else playSound('anvil', 0.85); // le geste : cachet sur enclume
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
        // Dédup serveur (flag `dedup`) : la lecture portait déjà son augure —
        // aucun nouveau sceau, aucune consumption : on affiche le sceau existant
        // SANS le son de succès (sinon le geste semble avoir réussi).
        if (!data.dedup) playSound(domain === 'des' ? 'seal-astro' : 'seal', 0.95);
        apply(data.echo);
        // place libérée/occupée : le compteur d'augures du compte suit (la
        // boîte disparaît ailleurs dès la dernière place prise, revient dès
        // qu'un verdict ou une suppression la libère).
        void reload();
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
  }, [domain, readingId, question, summary, apply, t, reload]);

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
        if (res.ok && data.echo) {
          apply(data.echo);
          // le verdict clos l'augure : sa place se libère, le sceau redevient
          // proposable — rafraîchir le compteur partagé.
          void reload();
        }
      } catch {
        /* réseau — le verdict pourra être repris plus tard */
      } finally {
        if (mounted.current) setSavingVerdict(false);
      }
    },
    [current, apply, reload],
  );

  const email = typeof window !== 'undefined' ? readEmail() : '';
  const text = current ? pickEchoText(current, lang) : '';
  const dueMs = current ? new Date(current.dueAt).getTime() : 0;
  const now = Date.now();
  const daysLeft = current ? Math.ceil((dueMs - now) / 86400000) : 0;
  const due = current && now >= dueMs;

  // ── Non connecté : on ne scelle rien (l'écho vit dans le compte) ──
  if (!email) return null;

  return (
    <div
      className="relative mt-8 rounded-2xl border backdrop-blur-sm overflow-hidden"
      style={moss
        ? { borderColor: 'rgba(159,196,173,0.35)', background: 'linear-gradient(180deg, rgba(20,54,31,0.55) 0%, rgba(8,26,16,0.75) 55%, rgba(4,14,9,0.85) 100%)' }
        : domain === 'des'
        ? { borderColor: 'rgba(212,175,55,0.45)', background: 'linear-gradient(180deg, rgba(20,36,90,0.6) 0%, rgba(10,20,48,0.78) 55%, rgba(4,6,15,0.88) 100%)' }
        : { borderColor: 'rgba(251,191,36,0.4)', background: 'linear-gradient(180deg, rgba(180,83,9,0.16) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.6) 100%)' }}
    >
      {/* halo doré discret */}
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: moss ? 'radial-gradient(ellipse at 50% -10%, rgba(159,196,173,0.22), transparent 60%)' : domain === 'des' ? 'radial-gradient(ellipse at 50% -10%, rgba(212,175,55,0.28), transparent 60%)' : 'radial-gradient(ellipse at 50% -10%, rgba(217,164,6,0.25), transparent 60%)' }} />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          {/* horloge ailée (glyphe SVG inline, jamais d'emoji) */}
          <svg viewBox="0 0 24 24" className={`w-5 h-5 shrink-0 ${moss ? 'text-[#9fc4ad]' : domain === 'des' ? 'text-[#E8C66A]' : 'text-amber-300'}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v4l2.5 2.5" />
            <path d="M4 12C2.5 10.5 1.5 9 1.5 7.5 4 7.5 5.5 8.5 6.5 10M20 12c1.5-1.5 2.5-3 2.5-4.5C20 7.5 18.5 8.5 17.5 10" />
          </svg>
          <h3 ref={titleRef} className={`font-serif tracking-wide ${moss ? 'text-[#e9d9ac]' : domain === 'des' ? 'text-[#E8C66A]' : 'text-amber-300'}`}
            style={{ fontFamily: 'var(--font-cinzel-deco), serif', whiteSpace: 'nowrap' }}>
            {t('echo.title')}
          </h3>
        </div>

        <AnimatePresence mode="wait">
          {/* ── État 1 : pas d'écho. Initié à quota épuisé : l'encart reste
              visible mais porte la NOTE explicite (où gérer ses augures) au
              lieu du bouton — rien à cliquer. Sinon : proposition de sceller. ── */}
          {!current && echoSlotsExhausted && (
            <motion.div key="quota" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center">
              <p className={`text-[14px] leading-relaxed ${moss ? 'text-[#cfe3d6]' : domain === 'des' ? 'text-[#DCE6F5]' : 'text-gray-200'}`}>{t('echo.quotaNote')}</p>
            </motion.div>
          )}
          {!current && !echoSlotsExhausted && (
            <motion.div key="seal" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center">
              <p className={`italic text-[15px] leading-relaxed mb-4 ${moss ? 'text-[#cfe3d6]' : domain === 'des' ? 'text-[#DCE6F5]' : 'text-gray-200'}`}>{t('echo.tease')}</p>
              <RuneButton variant="save" saveTint={moss ? 'cedar' : domain === 'des' ? 'astro' : domain} onClick={seal} disabled={sealing}>
                {sealing ? t('echo.sealing') : t('echo.seal')}
              </RuneButton>
              {sealError && <p className="mt-3 text-sm text-red-300/90">{sealError}</p>}
            </motion.div>
          )}

          {/* ── État 2 : scellé, échéance pas encore atteinte ── */}
          {current && !due && !broken && (
            <motion.div key="sealed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
              {domain === 'des' ? (
                /* Sceau officiel « L'Oracle des Étoiles » — rosace dorée,
                   propre aux augures des dés zodiacaux. */
                <img src="/images/sceau-des-divinatoires.png" alt="Sceau de l'Oracle des Étoiles"
                  className="mx-auto mb-3 w-16 h-16 object-contain" />
              ) : (
              <div
                className={`mx-auto mb-3 w-16 h-16 rounded-full border flex items-center justify-center ${moss ? 'border-[#9fc4ad]/50' : 'border-amber-400/50'}`}
                style={moss
                  ? { background: 'linear-gradient(180deg, rgba(63,142,92,0.3), rgba(0,0,0,0.45))', boxShadow: '0 0 24px rgba(63,142,92,0.35)' }
                  : { background: 'linear-gradient(180deg, rgba(245,158,11,0.25), rgba(0,0,0,0.4))', boxShadow: '0 0 24px rgba(217,164,6,0.35)' }}
              >
                {/* sceau : rune + boucle */}
                <svg viewBox="0 0 24 24" className={moss ? 'w-8 h-8 text-[#e9d9ac]' : 'w-8 h-8 text-amber-300'} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
                  <path d="M6 3v18M6 6l12-3M6 12l12-6M6 18l12-6" />
                </svg>
              </div>
              )}
              <p className={`text-[15px] leading-relaxed ${moss ? 'text-[#e9d9ac]' : domain === 'des' ? 'text-[#DCE6F5]' : 'text-amber-100/90'}`}>
                {t('echo.sealedLine').replace('{date}', sealDate(current.dueAt, lang))}
              </p>
              <p className={`mt-1 text-xs ${moss ? 'text-[#9fc4ad]' : domain === 'des' ? 'text-[#8FA3C8]' : 'text-gray-400'}`}>{t('echo.daysLeft').replace('{n}', String(Math.max(0, daysLeft)))}</p>
            </motion.div>
          )}

          {/* ── État 3 : échéance atteinte → briser le sceau / verdict ── */}
          {current && due && (
            <motion.div key="due" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {!broken && !current.verdict && (
                <div className="text-center">
                  <p className={`text-[15px] leading-relaxed mb-4 ${moss ? 'text-[#cfe3d6]' : domain === 'des' ? 'text-[#DCE6F5]' : 'text-amber-100/90'}`}>{t('echo.dueNow')}</p>
                  <RuneButton variant="save" saveTint={moss ? 'cedar' : domain === 'des' ? 'astro' : domain} onClick={() => setBroken(true)}>
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
                    className={`italic text-[16px] sm:text-[17px] leading-relaxed ${moss ? 'text-[#e9d9ac]' : domain === 'des' ? 'text-[#E8C66A]' : 'text-amber-100'}`}
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
                      <p className={`text-sm mb-3 ${moss ? 'text-[#cfe3d6]' : domain === 'des' ? 'text-[#8FA3C8]' : 'text-gray-300'}`}>{t('echo.verdictAsk')}</p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        {(['oui', 'partiel', 'non'] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            disabled={savingVerdict}
                            onClick={() => verdict(v)}
                            className={`rounded-full px-5 py-2 text-sm font-bold border transition-colors disabled:opacity-50 ${moss ? 'border-[#9fc4ad]/50 text-[#e9d9ac] bg-black/40 hover:bg-[#1f5234]/60' : domain === 'des' ? 'border-[#D4AF37]/50 text-[#E8C66A] bg-black/40 hover:bg-[#14245a]/60' : 'border-amber-400/50 text-amber-100 bg-black/40 hover:bg-amber-900/40'}`}
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
