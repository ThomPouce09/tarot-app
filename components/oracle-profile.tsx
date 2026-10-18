'use client';

// Mon espace > Profil oracle — champs entièrement optionnels qui aident
// l'Oracle à affiner ses interprétations (buildProfileBlock côté serveur).
// Charte : pastilles dorées = sélectionnées (même style que Préférences >
// Langue), panneau mystique, « Enregistrer » = mystic-btn (couleur des boutons
// de Mon espace).
// APK : toutes les requêtes passent par api() (en-tête X-Session).

import { useCallback, useEffect, useState } from 'react';
import { useT, useLang } from '@/lib/i18n';
import { countryName, DEFAULT_COUNTRY, COUNTRY_OPTIONS } from '@/lib/country-names';
import { api } from '@/lib/api-client';

type Profile = {
  domains: string[];
  lifeStage: string | null;
  tone: string | null;
  familiarity: string | null;
  birthCountry: string | null;
  birthTown: string | null;
  birthHour: string | null;
  comment: string | null;
};

const EMPTY: Profile = { domains: [], lifeStage: null, tone: null, familiarity: null, birthCountry: null, birthTown: null, birthHour: null, comment: null };

const DOMAINS = ['amour', 'famille', 'travail', 'etudes', 'argent', 'projets', 'serenite'];
const STAGES = ['etudes', 'active', 'reconversion', 'parenthese', 'retraite', 'installation', 'separation', 'nouveau-depart'];
const TONES = ['direct', 'poetique', 'concret', 'introspection'];
const FAMS = ['debutant', 'habitue', 'praticien'];

// Pilule dorée (sélection) / fant sombre cerclé d'or — rendu identique aux
// pastilles de langue de Préférences (charte).
function Pill({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="rounded-[0.6rem] py-2.5 px-3 text-sm font-semibold transition-all duration-200 hover:brightness-110"
      style={
        on
          ? {
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 58%), linear-gradient(135deg, #F0C75E, #B8860B)',
              color: '#34121F',
              border: '1px solid rgba(240,199,94,0.9)',
              boxShadow: '0 4px 14px rgba(218,165,32,0.4), inset 0 -3px 8px rgba(122,74,4,0.45)',
            }
          : {
              background: 'linear-gradient(135deg, rgba(90,58,30,0.5), rgba(58,36,16,0.5))',
              color: '#F5EAD6',
              border: '1px solid rgba(218,165,32,0.35)',
              boxShadow: 'inset 0 1px 0 rgba(240,199,94,0.07)',
            }
      }
    >
      {on ? '✓ ' : ''}{label}
    </button>
  );
}

export default function OracleProfileForm() {
  const t = useT();
  const lang = useLang();
  const [p, setP] = useState<Profile>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<'saved' | 'error' | null>(null);

  const email = useCallback((): string => {
    try {
      const raw = localStorage.getItem('tarot_user');
      return raw ? String(JSON.parse(raw)?.email ?? '').trim().toLowerCase() : '';
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    const e = email();
    if (!e) { setLoaded(true); return; }
    let cancel = false;
    api(`/api/profile?email=${encodeURIComponent(e)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancel || !d) return;
        setP({
          domains: Array.isArray(d.domains) ? d.domains : [],
          lifeStage: d.lifeStage ?? null, tone: d.tone ?? null, familiarity: d.familiarity ?? null,
          birthCountry: d.birthCountry ?? null, birthTown: d.birthTown ?? null, birthHour: d.birthHour ?? null,
          comment: d.comment ?? null,
        });
      })
      .catch(() => { /* profil vide affiché — jamais bloquant */ })
      .finally(() => !cancel && setLoaded(true));
    return () => { cancel = true; };
  }, [email]);

  const toggleDomain = (d: string) =>
    setP((s) => ({ ...s, domains: s.domains.includes(d) ? s.domains.filter((x) => x !== d) : [...s.domains, d] }));
  const pick = <K extends 'lifeStage' | 'tone' | 'familiarity'>(k: K, v: string) =>
    setP((s) => ({ ...s, [k]: s[k] === v ? null : v })); // re-clic = désélectionner

  const save = async () => {
    const e = email();
    if (!e) { setMsg('error'); return; }
    setSaving(true);
    setMsg(null);
    try {
      const r = await api('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, ...p }),
      });
      setMsg(r.ok ? 'saved' : 'error');
      if (r.ok) {
        // L'Oracle en tiendra compte dès le prochain tirage — rien d'autre à faire.
      }
    } catch {
      setMsg('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mystic-panel p-5 sm:p-7 space-y-4">
      <div className="flex items-center gap-3">
        <img src="/images/creatures/renard-rappel-profil.png" alt="" className="h-6 w-6 object-contain" style={{ filter: 'drop-shadow(0 0 4px rgba(245,180,80,0.35))' }} />
        <h2 className="mystic-subtitle text-sm">{t('profile.title')}</h2>
      </div>

      {/* A1 — l'encadrant de bienfaisance : même encadré et même couleur que
          le bloc pied de page (sinon il ne se voit pas sur le panneau). */}
      <div className="rounded-xl border border-amber-800/25 bg-black/20 p-4">
        <p className="text-amber-100/75 text-[13px] leading-relaxed">{t('profile.reassurance')}</p>
      </div>

      {!loaded ? (
        <p className="text-center py-10 text-[#FFE45C]" style={{ fontFamily: 'var(--font-cinzel), serif' }}>…</p>
      ) : (
        <>
          {/* 1 — Domaines de prédilection (multi-pastilles) */}
          <div className="rounded-xl border border-amber-800/25 bg-black/20 p-4">
            <h2 className="mystic-subtitle text-sm mb-3">{t('profile.domains')}</h2>
            <div role="group" aria-label={t('profile.domains')} className="flex flex-wrap gap-2">
              {DOMAINS.map((d) => (
                <Pill key={d} on={p.domains.includes(d)} label={t(`profile.dom.${d}`)} onClick={() => toggleDomain(d)} />
              ))}
            </div>
          </div>

          {/* 2 — Étape de vie (choix unique) */}
          <div className="rounded-xl border border-amber-800/25 bg-black/20 p-4">
            <h2 className="mystic-subtitle text-sm mb-3">{t('profile.lifeStage')}</h2>
            <div role="group" aria-label={t('profile.lifeStage')} className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <Pill key={s} on={p.lifeStage === s} label={t(`profile.stage.${s}`)} onClick={() => pick('lifeStage', s)} />
              ))}
            </div>
          </div>

          {/* 3 — Ton préféré (choix unique) */}
          <div className="rounded-xl border border-amber-800/25 bg-black/20 p-4">
            <h2 className="mystic-subtitle text-sm mb-3">{t('profile.tone')}</h2>
            <div role="group" aria-label={t('profile.tone')} className="flex flex-wrap gap-2">
              {TONES.map((s) => (
                <Pill key={s} on={p.tone === s} label={t(`profile.tone.${s}`)} onClick={() => pick('tone', s)} />
              ))}
            </div>
          </div>

          {/* 4 — Familiarité (choix unique) */}
          <div className="rounded-xl border border-amber-800/25 bg-black/20 p-4">
            <h2 className="mystic-subtitle text-sm mb-3">{t('profile.familiarity')}</h2>
            <div role="group" aria-label={t('profile.familiarity')} className="flex flex-wrap gap-2">
              {FAMS.map((s) => (
                <Pill key={s} on={p.familiarity === s} label={t(`profile.fam.${s}`)} onClick={() => pick('familiarity', s)} />
              ))}
            </div>
          </div>

          {/* 5/6 — Lieu + heure de naissance (aide au calcul de l'ascendant) */}
          <div className="rounded-xl border border-amber-800/25 bg-black/20 p-4">
            <h2 className="mystic-subtitle text-sm mb-1">{t('profile.birth')}</h2>
            <p className="text-amber-100/70 text-xs mb-3">{t('profile.birthHint')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-amber-200/80">{t('profile.birthCountry')}</span>
                <select
                  value={p.birthCountry ?? DEFAULT_COUNTRY}
                  onChange={(e) => setP((s) => ({ ...s, birthCountry: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-violet-500/40 bg-black/30 px-3 py-2 text-sm text-amber-50 outline-none focus:border-violet-400/70 [color-scheme:dark]"
                >
                  {COUNTRY_OPTIONS.map((iso) => (
                    <option key={iso} value={iso}>{countryName(iso, lang)}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-amber-200/80">{t('profile.birthTown')}</span>
                <input
                  type="text"
                  value={p.birthTown ?? ''}
                  onChange={(e) => setP((s) => ({ ...s, birthTown: e.target.value.slice(0, 60) }))}
                  placeholder={t('profile.birthTownPh')}
                  autoComplete="address-level2"
                  className="mt-1 w-full rounded-lg border border-violet-500/40 bg-black/30 px-3 py-2 text-sm text-amber-50 outline-none focus:border-violet-400/70"
                />
              </label>
              <label className="block">
                <span className="text-xs text-amber-200/80">{t('profile.birthHour')}</span>
                <input
                  type="time"
                  value={p.birthHour ?? ''}
                  onChange={(e) => setP((s) => ({ ...s, birthHour: e.target.value || null }))}
                  className="mt-1 w-full rounded-lg border border-violet-500/40 bg-black/30 px-3 py-2 text-sm text-amber-50 outline-none focus:border-violet-400/70 [color-scheme:dark]"
                />
              </label>
            </div>
          </div>

          {/* 7 — Mot libre : ce que le consultant veut partager sur lui-même.
              Alimente le prompt de l'Oracle (« sa propre description »). */}
          <div className="rounded-xl border border-amber-800/25 bg-black/20 p-4">
            <label htmlFor="profile-comment" className="mystic-subtitle text-sm block mb-2">{t('profile.comment')}</label>
            <textarea
              id="profile-comment"
              value={p.comment ?? ''}
              onChange={(e) => setP((s) => ({ ...s, comment: e.target.value }))}
              rows={3}
              maxLength={200}
              className="w-full rounded-lg border border-violet-500/40 bg-black/30 px-3 py-2 text-sm text-amber-50 outline-none focus:border-violet-400/70 resize-none"
              placeholder={t('profile.commentPh')}
            />
          </div>

          {msg === 'saved' && (
            <p role="status" aria-live="polite" className="text-amber-200 text-sm px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/30">
              {t('profile.saved')}
            </p>
          )}
          {msg === 'error' && (
            <p role="status" aria-live="polite" className="text-red-300 text-sm px-3 py-2 rounded-lg bg-red-950/30 border border-red-800/40">
              {t('profile.error')}
            </p>
          )}

          {/* « Enregistrer » = couleur des boutons de Mon espace (mystic-btn) */}
          <button type="button" onClick={save} disabled={saving} className="mystic-btn w-full disabled:opacity-60">
            {saving ? '…' : t('profile.save')}
          </button>

          {/* A2 — bloc confidentialité (pied de l'onglet) */}
          <div className="rounded-xl border border-amber-800/25 bg-black/20 p-4">
            <h2 className="mystic-subtitle text-sm mb-2">{t('profile.privacyTitle')}</h2>
            <p className="text-amber-100/75 text-[13px] leading-relaxed">{t('profile.privacy')}</p>
          </div>
        </>
      )}
    </div>
  );
}
