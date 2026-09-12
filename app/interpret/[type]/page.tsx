'use client';

import { Fragment, Suspense, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import YiSlideNav from '@/components/yi-slide-nav';
import { usePathname, useSearchParams } from 'next/navigation';
import WaitOverlay from '@/components/wait-overlay';
import { useLang, useT } from '@/lib/i18n';
import { getHexagramTrigrams } from '@/lib/yijing-data';
import { TAROT_CARDS } from '@/lib/tarot-data';
import { IconSituation, IconDefis, IconSoutien, IconIssue, IconConseil, IconResume } from '@/components/yi-icons';
import { EntitlementGateModal } from '@/lib/use-entitlement';
import { api } from '@/lib/api-client';
import EchoBox from '@/components/echo-box';
import { parseYiQuestion, YI_LACQUER, IconDragon, IconBird, IconTiger, IconWarrior } from '@/app/yi-jing-simplifie/theme-selector';
import { parseTarotQuestion, TAROT_NIGHT } from '@/app/tarot-3-cartes-simplifie/theme-selector';

interface Interpretation {
  situation?: string;
  defis?: string;
  soutien?: string;
  issue?: string;
  conseil?: string;
  introduction?: string;
  situationYiJing?: string;
  action?: string;
  conseilYiJing?: string;
  resume?: string;
  numero?: number;
  nom?: string;
  meditation?: string;
  attitude?: string;
  [key: string]: string | number | undefined;
}

function InterpretationInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname(); // e.g., /interpret/tarot-3-cartes
  const lang = useLang();
  const t = useT();

  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gateReason, setGateReason] = useState<any>(null);
  const [hexagram, setHexagram] = useState<{
    numero: number;
    name?: string;
    frenchName?: string;
    name_en?: string;
    glyph?: string;
    ideogram?: string;
    pinyin?: string;
    trigramSuperior?: string;
    trigramInferior?: string;
    semanticEssence?: string;
    synthese?: string;
    synthese_en?: string;
  } | null>(null);
  const doneRef = useRef<string | null>(null);
  // Domaine & intention choisis au sélecteur (question « Domaine — intention »)
  // → bandeau d'en-tête de la page d'interprétation.
  const yiTheme = parseYiQuestion(searchParams.get('question'));
  // Arcane-guide & intention choisis au sélecteur de « 3 Cartes Simplifié »
  // (question « Arcane — intention ») → bandeau bois/bordeaux & or en tête.
  const tarotTheme = parseTarotQuestion(searchParams.get('question'));
  // Question libre posée à l'oracle (Yi Jing précis) → affichage sublime en tête.
  const rawQuestion = (searchParams.get('question') || '').trim();
  const GUARDIAN_ICONS: Record<string, (c: string) => JSX.Element> = {
    Qinglong: IconDragon,
    Zhuque: IconBird,
    Baihu: IconTiger,
    Xuanwu: IconWarrior,
  };
  // Vidéo de chargement Yi Jing : prioritaire, doit jouer en entier avant le relais
  const [videoEnded, setVideoEnded] = useState(false);
  const MIN_VIDEO_MS = 3500;

  // Extract type from pathname: /interpret/tarot-3-cartes -> tarot-3-cartes
  const type = pathname.split('/')[2] || '';

  useEffect(() => {
    if (!type) {
      setError('Type d\'interprétation manquant');
      setLoading(false);
      return;
    }

    // Guard idempotent : searchParams change de référence à chaque render
    // -> sans ça, le effect re-fire et sauvegarde le tirage 2× (doublon).
    const sig = type + '|' + searchParams.toString();
    if (doneRef.current === sig) return;
    doneRef.current = sig;

    const question = searchParams.get('question');
    const userId = searchParams.get('userId');
    const baguette = searchParams.get('baguette');

    // Récupère l'hexagramme correspondant à la baguette tirée (Yi Jing)
    if (baguette && (type.startsWith('yi-jing') || type === 'yi-qing')) {
      const num = parseInt(baguette, 10);
      if (!isNaN(num)) {
        api(`/api/hexagram/${num}`)
          .then((r) => r.json())
          .then((d) => { if (d.found) setHexagram(d.hexagram); })
          .catch(() => {});
      }
    }

    // Determine payload based on type
    const isTarot = type.startsWith('tarot');
    const isYiJing = type.startsWith('yi-jing') || type === 'yi-qing';

    let payload: any = {
      type,
      question: question || undefined,
      userId: userId || undefined,
      lang,
    };

    if (isTarot) {
      const cartes = searchParams.get('cartes');
      if (!cartes) {
        setError('Données de tirage manquantes (cartes)');
        setLoading(false);
        return;
      }
      // Parse cartes from string "1,2,3" to number[]
      let cardIds: number[] = [];
      try {
        cardIds = cartes.split(',').map(Number);
        if (cardIds.some(isNaN)) throw new Error('Invalid card IDs');
      } catch (e) {
        setError('Format des cartes invalide');
        setLoading(false);
        return;
      }
      payload.cartes = cardIds;
    } else if (isYiJing) {
      const baguette = searchParams.get('baguette');
      if (!baguette) {
        setError('Données de tirage manquantes (baguette)');
        setLoading(false);
        return;
      }
      const baguetteNum = parseInt(baguette, 10);
      if (isNaN(baguetteNum)) {
        setError('Format de la baguette invalide');
        setLoading(false);
        return;
      }
      payload.baguette = baguetteNum;
    } else {
      setError('Type d\'interprétation non supporté');
      setLoading(false);
      return;
    }

    api('/api/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json().then((data) => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status === 402) {
          setGateReason(data.reason || 'limit-grand');
          setError(null);
          setLoading(false);
          return;
        }
        if (data.error) throw new Error(data.error);
        setInterpretation(data);
      })
      .catch((err) => {
        setError(err.message);
        setInterpretation(null);
      })
      .finally(() => setLoading(false));
  }, [type, searchParams]);

  if (gateReason) {
    return <EntitlementGateModal reason={gateReason} onClose={() => setGateReason(null)} />;
  }

  if (loading || !videoEnded) {
    // ready = l'interprétation est arrivée → l'overlay peut enchaîner vers la
    // sortie (les vidéos bouclent en attendant).
    return <WaitOverlay type={type} ready={!loading} onVideoEnded={() => setVideoEnded(true)} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    );
  }

  if (!interpretation) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-gray-400">{t('interpret.noInterpretation')}</p>
      </div>
    );
  }

  // Determine if it's Tarot or Yi Jing based on type prefix
  const isTarot = type.startsWith('tarot');
  const isYiJing = type.startsWith('yi-jing') || type === 'yi-qing';
  // Titres d'interprétation : Allura (script féerique) pour le Tarot,
  // Hoshiko Satsuki (calligraphie) pour le Yi Jing.
  const titleFont = isTarot ? "'Allura', cursive" : "'Hoshiko Satsuki', serif";
  const trigs = hexagram ? getHexagramTrigrams(hexagram.numero, lang) : { superior: null, inferior: null };
  // Cartes tirées (Tarot) : id + nom + position, pour le récap visuel en haut de page
  const tarotCards = isTarot
    ? (searchParams.get('cartes') || '')
        .split(',')
        .map((s) => parseInt(s, 10))
        .filter((n) => !isNaN(n))
        .map((id, i) => ({
          id,
          name: TAROT_CARDS.find((c) => c.id === id)?.name || `Carte ${id}`,
          position: i === 0 ? 'Présent' : i === 1 ? 'Passé' : 'Avenir',
        }))
    : [];

  // Sections d'analyse (Tarot 3 cartes : Passé/Présent/Avenir ; sinon situation/défis/...)
  const isTarot3 = isTarot && type === 'tarot-3-cartes';
  const sections: { label: string; value?: string | number; Icon?: React.ComponentType<{ className?: string }> }[] = isTarot3
    ? [
        { label: 'Passé', value: interpretation.passe },
        { label: 'Présent', value: interpretation.present },
        { label: 'Avenir', value: interpretation.avenir },
      ]
    : [
        { label: t('interpret.situation'), value: interpretation.situation, Icon: IconSituation },
        { label: t('interpret.defis'), value: interpretation.defis, Icon: IconDefis },
        { label: t('interpret.soutien'), value: interpretation.soutien, Icon: IconSoutien },
        { label: t('interpret.issue'), value: interpretation.issue, Icon: IconIssue },
        { label: t('interpret.conseil'), value: interpretation.conseil, Icon: IconConseil },
      ];

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col items-center p-4 overflow-y-auto"
      style={{
        backgroundImage: 'url(/backgrounds/interpret-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Voile sombre pour la lisibilité du texte */}
      <div className="pointer-events-none fixed inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <YiSlideNav />
        {/* En-tête : titre seul (le menu tiroir remplace la croix) */}
        <div className="w-full max-w-md flex items-center justify-between mt-4 mb-6">
          <h1 className="text-3xl text-yellow-400" style={{ fontFamily: titleFont }}>
            {isTarot ? t('interpret.titleTarot') : t('interpret.yijingSpoke')}
          </h1>
        </div>

        {/* Question posée à l'oracle — « Yi Jing précis » : apparition sublime en tête
            (le « Yi Jing simplifié » affiche lui le bandeau Domaine & Intention) */}
        {type === 'yi-jing-simple' && !yiTheme && rawQuestion && (
          <div className="yi-question-card w-full max-w-md mb-6 overflow-hidden rounded-2xl border border-yellow-500/30 bg-black/45 backdrop-blur-sm shadow-[0_0_28px_rgba(243,201,105,0.14)]">
            <p className="pt-4 text-center text-yellow-500/70 text-[10px] uppercase tracking-[0.3em]" style={{ fontFamily: titleFont }}>
              {lang === 'en' ? 'The question asked' : 'La question posée'}
            </p>
            <div className="yi-q-line mx-8 mt-2 mb-3 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
            <p
              className="yi-q-text px-6 pb-2 text-center text-lg sm:text-xl leading-relaxed text-yellow-100 italic"
              style={{ fontFamily: 'var(--font-cinzel), Georgia, serif', color: YI_LACQUER.gold }}
            >
              « {rawQuestion} »
            </p>
            {/* Baguette élue — rappel discret, petite animation d'entrée */}
            {(() => {
              const num = hexagram?.numero ?? parseInt(searchParams.get('baguette') || '', 10);
              if (isNaN(num)) return null;
              return (
                <div className="yi-stalk-chip flex items-center justify-center gap-2 pt-1 pb-1">
                  <span className="h-px w-6 bg-gradient-to-r from-transparent to-yellow-400/50" />
                  <span
                    className="text-yellow-200/60 text-[11px] uppercase tracking-[0.22em]"
                    style={{ fontFamily: titleFont }}
                  >
                    {lang === 'en' ? 'Stalk' : 'Baguette'}
                  </span>
                  <span
                    className="yi-stalk-num text-lg leading-none"
                    style={{ fontFamily: "'Hoshiko Satsuki', serif", color: YI_LACQUER.gold }}
                  >
                    {String(num).padStart(2, '0')}
                  </span>
                  {hexagram && (
                    <span className="text-sm leading-tight" style={{ fontFamily: "'Hoshiko Satsuki', serif", color: YI_LACQUER.lilac, textTransform: 'capitalize' }}>
                      {lang === 'en' ? (hexagram.name_en || hexagram.frenchName || '') : (hexagram.frenchName || hexagram.name || '')}
                    </span>
                  )}
                  <span className="h-px w-6 bg-gradient-to-l from-transparent to-yellow-400/50" />
                </div>
              );
            })()}
            <p className="pb-4 pt-2 text-center text-yellow-100/40 text-[11px] italic">
              {lang === 'en' ? 'The yarrow stalks echo your question…' : 'Les baguettes d’achillée résonnent de votre question…'}
            </p>
          </div>
        )}

        {/* Question posée à l'oracle — « 3 Cartes · Précis » : même apparition
            sublime en tête, aux couleurs du Tarot (bois, bordeaux & or). Le
            « 3 Cartes Simplifié » affiche lui le bandeau Arcane-guide. */}
        {type === 'tarot-3-cartes' && !tarotTheme && rawQuestion && (
          <div className="yi-question-card w-full max-w-md mb-6 overflow-hidden rounded-2xl border border-[#DAA520]/30 bg-black/45 backdrop-blur-sm shadow-[0_0_28px_rgba(74,25,49,0.45)]">
            <p className="pt-4 text-center text-[#DAA520]/70 text-[10px] uppercase tracking-[0.3em]" style={{ fontFamily: titleFont }}>
              {lang === 'en' ? 'The question asked' : 'La question posée'}
            </p>
            <div className="yi-q-line mx-8 mt-2 mb-3 h-px bg-gradient-to-r from-transparent via-[#DAA520]/60 to-transparent" />
            <p
              className="yi-q-text px-6 pb-2 text-center text-lg sm:text-xl leading-relaxed italic"
              style={{ fontFamily: 'var(--font-cinzel), Georgia, serif', color: '#FFD700' }}
            >
              « {rawQuestion} »
            </p>
            <p className="pb-4 pt-2 text-center text-[#E2B8AC]/50 text-[11px] italic">
              {lang === 'en' ? 'The arcana unfold around your question…' : 'Les arcanes se déploient autour de votre question…'}
            </p>
          </div>
        )}

        {/* Domaine & intention — bandeau laque & or repris du sélecteur */}
        {yiTheme && (() => {
          const { domain, sub } = yiTheme;
          const GuardianIcon = GUARDIAN_ICONS[domain.guardian];
          return (
            <div
              className="w-full max-w-md mb-6 overflow-hidden rounded-2xl border border-yellow-500/30 shadow-[0_0_24px_rgba(243,201,105,0.12)]"
              style={{ background: `linear-gradient(160deg, ${YI_LACQUER.panelTop} 0%, ${YI_LACQUER.panelMid} 55%, ${YI_LACQUER.panelDeep} 100%)` }}
            >
              <div className="flex items-center gap-4 px-5 py-4">
                {GuardianIcon && (
                  <span className="shrink-0 grid place-items-center w-12 h-12 rounded-full border border-yellow-500/25 bg-black/30 drop-shadow-[0_0_10px_rgba(243,201,105,0.25)]">
                    {GuardianIcon(YI_LACQUER.gold)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-yellow-500/70 text-[10px] uppercase tracking-[0.22em] mb-0.5">
                    {lang === 'en' ? 'Domain' : 'Domaine'}
                  </p>
                  <p className="text-lg leading-tight font-semibold truncate" style={{ fontFamily: titleFont, color: YI_LACQUER.gold }}>
                    {domain.label[lang]}
                  </p>
                </div>
              </div>
              <div className="mx-5 h-px bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent" />
              <div className="px-5 py-3.5">
                <p className="text-yellow-500/70 text-[10px] uppercase tracking-[0.22em] mb-1">
                  {lang === 'en' ? 'Intention' : 'Intention'}
                </p>
                <p className="text-sm leading-snug" style={{ color: YI_LACQUER.lilac }}>
                  {sub}
                </p>
                <p className="text-[11px] italic mt-1.5 text-yellow-100/40">{domain.realm[lang]}</p>
              </div>
            </div>
          );
        })()}

        {/* Arcane-guide & intention — bandeau boudoir tarotique (marron bois, bordeaux & or),
            repris du sélecteur de « 3 Cartes Simplifié ». */}
        {tarotTheme && (() => {
          const { theme, sub } = tarotTheme;
          return (
            <div
              className="w-full max-w-md mb-6 overflow-hidden rounded-2xl border border-[#DAA520]/30 shadow-[0_0_26px_rgba(74,25,49,0.45)]"
              style={{ background: `linear-gradient(160deg, ${TAROT_NIGHT.panelTop} 0%, ${TAROT_NIGHT.panelMid} 55%, ${TAROT_NIGHT.panelDeep} 100%)` }}
            >
              <div className="flex items-center gap-4 px-5 py-4">
                <span className="shrink-0 grid place-items-center w-12 h-12 rounded-full border border-[#DAA520]/25 bg-black/30 drop-shadow-[0_0_10px_rgba(218,165,32,0.3)]">
                  {theme.icon(TAROT_NIGHT.gold)}
                </span>
                <div className="min-w-0">
                  <p className="text-[#DAA520]/70 text-[10px] uppercase tracking-[0.22em] mb-0.5">
                    {lang === 'en' ? 'Guide-arcana' : 'Arcane-guide'}
                  </p>
                  <p className="text-lg leading-tight font-semibold truncate" style={{ fontFamily: titleFont, color: TAROT_NIGHT.gold }}>
                    {theme.label[lang]}
                  </p>
                  <p className="text-[11px] italic" style={{ color: `${TAROT_NIGHT.roseDim}cc` }}>{theme.sigil[lang]}</p>
                </div>
              </div>
              <div className="mx-5 h-px bg-gradient-to-r from-transparent via-[#DAA520]/45 to-transparent" />
              <div className="px-5 py-3.5">
                <p className="text-[#DAA520]/70 text-[10px] uppercase tracking-[0.22em] mb-1">
                  {lang === 'en' ? 'Intention' : 'Intention'}
                </p>
                <p className="text-sm leading-snug" style={{ color: TAROT_NIGHT.rose }}>
                  {sub}
                </p>
              </div>
            </div>
          );
        })()}

      {/* Votre tirage — cartes tirées (miniatures) en haut de page */}
      {isTarot && tarotCards.length > 0 && (
        <div className="w-full max-w-md mb-2">
          <p className="text-yellow-500/80 text-xs uppercase tracking-[0.18em] mb-3 text-center">Votre tirage</p>
          <div className="flex justify-center items-end gap-3">
            {tarotCards.map((c, i) => (
              <div key={c.id} className="flex flex-col items-center gap-1.5 w-1/3 max-w-[110px]">
                <div className="relative rounded-lg overflow-hidden border border-yellow-500/40 shadow-[0_0_14px_rgba(255,200,90,0.35)] bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/cards/arcana/${c.id}.jpg`}
                    alt={c.name}
                    className="w-full h-auto block"
                    style={{ aspectRatio: '764 / 1286' }}
                  />
                </div>
                <span className="text-yellow-300 text-xs font-semibold tracking-wide">{c.position}</span>
                <span className="text-yellow-100/90 text-[11px] leading-tight text-center line-clamp-2">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-md text-left space-y-5">
          <>

            {/* Récap baguette élue — Yi Jing simple + question + tirage des achillées */}
            {(type === 'yi-jing-simple' || type === 'yi-jing-simplifie' || type === 'yi-jing-question') && hexagram && (
              <div className="p-6 rounded-2xl border border-yellow-500/30 bg-yellow-900/10 backdrop-blur-sm">
                <div className="flex items-center gap-5">
                  {hexagram.glyph && (
                    <span className="shrink-0 text-6xl leading-none text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.35)]" style={{ fontFamily: "'Hoshiko Satsuki', serif" }}>
                      {hexagram.glyph}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-yellow-200 text-sm font-semibold tracking-wide mb-1">
                      {t('interpret.baguette')} : {String(hexagram.numero).padStart(2, '0')}
                    </p>
                    <p className="text-yellow-400 font-semibold text-2xl leading-tight" style={{ fontFamily: "'Hoshiko Satsuki', serif", textTransform: 'capitalize' }}>
                      {lang === 'en' ? (hexagram.name_en || hexagram.frenchName || hexagram.name || 'Hexagram') : (hexagram.frenchName || hexagram.name || 'Hexagramme')}
                    </p>
                    {hexagram.pinyin && (
                      <p className="text-yellow-400/90 text-sm italic mt-0.5">
                        {hexagram.pinyin}
                      </p>
                    )}
                  </div>
                </div>

                {/* Traduction : les 2 trigrammes réels (supérieur / inférieur) */}
                {(trigs.superior || trigs.inferior) && (
                  <div className="mt-5 pt-4 border-t border-yellow-500/15">
                    <p className="text-yellow-500/80 text-xs uppercase tracking-[0.18em] mb-3">Traduction</p>
                    <div className="flex flex-col gap-3">
                      {trigs.superior && (
                        <div className="flex items-start gap-3">
                          <span className="shrink-0 text-4xl leading-none text-yellow-300 drop-shadow-[0_0_8px_rgba(255,215,0,0.3)]">
                            {trigs.superior.symbol}
                          </span>
                          <div>
                            <p className="text-yellow-100 font-medium text-sm">
                              {trigs.superior.name} <span className="text-yellow-500/60">(supérieur)</span>
                            </p>
                            <p className="text-gray-300 text-xs">{trigs.superior.meaning}</p>
                          </div>
                        </div>
                      )}
                      {trigs.inferior && (
                        <div className="flex items-start gap-3">
                          <span className="shrink-0 text-4xl leading-none text-yellow-300 drop-shadow-[0_0_8px_rgba(255,215,0,0.3)]">
                            {trigs.inferior.symbol}
                          </span>
                          <div>
                            <p className="text-yellow-100 font-medium text-sm">
                              {trigs.inferior.name} <span className="text-yellow-500/60">(inférieur)</span>
                            </p>
                            <p className="text-gray-300 text-xs">{trigs.inferior.meaning}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Synthèse de l'hexagramme — police réduite sur mobile */}
                {(lang === 'en' ? hexagram.synthese_en : hexagram.synthese) && (
                  <p className="mt-5 pt-4 border-t border-yellow-500/15 text-gray-300/90 text-xs sm:text-sm leading-relaxed" style={{ fontFamily: 'Arial, sans-serif', fontStyle: 'italic' }}>
                    {lang === 'en' ? (hexagram.synthese_en || hexagram.synthese) : hexagram.synthese}
                  </p>
                )}
              </div>
            )}

            {/* Analyse détaillée — Tarot 3 cartes : Passé/Présent/Avenir ; sinon situation/défis/... */}
            {sections.filter((s) => s.value).map((section, idx, arr) => (
              <Fragment key={section.label}>
                <div className="p-5 rounded-2xl border border-yellow-500/20 bg-white/[0.03] backdrop-blur-sm">
                  <h2 className="text-yellow-500 font-semibold text-lg tracking-wide mb-2 flex items-center gap-2.5" style={{ fontFamily: titleFont, textTransform: 'capitalize' }}>
                    {section.Icon && <section.Icon className="w-[22px] h-[22px] text-yellow-400/90 shrink-0" />}
                    {section.label}
                  </h2>
                  <p className="text-gray-200 leading-relaxed text-[15px]">{section.value}</p>
                </div>
                {isTarot3 && idx < arr.length - 1 && (
                  <div className="flex items-center justify-center py-1" aria-hidden>
                    <div className="h-px w-2/3 bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
                    <span className="mx-2 text-yellow-400/70 text-lg leading-none">→</span>
                    <div className="h-px w-2/3 bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
                  </div>
                )}
              </Fragment>
            ))}

            {/* ✶ Résumé du tirage — en fin (synthèse globale) */}
            {interpretation.resume && (
              <div className="relative p-6 rounded-2xl border border-yellow-400/40 bg-gradient-to-b from-yellow-900/25 to-black/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3">
                  <IconResume className="w-5 h-5 text-yellow-400 shrink-0" />
                  <h3 className="text-yellow-300 font-serif text-xl tracking-wide" style={{ fontFamily: titleFont, textTransform: 'capitalize' }}>Résumé</h3>
                </div>
                <p className="text-gray-100 leading-relaxed italic text-[15px]">
                  {interpretation.resume}
                </p>
              </div>
            )}

            {/* ✶ L'Écho scellé — prémonction datée (Initié / Arkane) */}
            <EchoBox
              domain={isTarot ? 'tarot' : 'yi-jing'}
              readingId={typeof interpretation.readingId === 'string' ? interpretation.readingId : null}
              question={searchParams.get('question')}
              summary={String(interpretation.resume || interpretation.conseil || interpretation.avenir || interpretation.issue || '')}
            />
          </>
        </div>
      </div>
      </div>
  );
}

export default function InterpretationPage() {
  return (
    <Suspense fallback={<WaitOverlay type="" />}>
      <InterpretationInner />
    </Suspense>
  );
}
