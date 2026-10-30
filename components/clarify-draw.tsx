'use client';

// components/clarify-draw.tsx — La LAME DE PRÉCISION (questions enchaînées,
// tirages tarot avancés : « 3 Cartes · Précis » et « 5 Cartes Manuelles »).
//
// Deux exports :
//   ClarifyDrawPortal — portail plein écran : exactement le même environnement
//     et les mêmes animations que le tirage d'origine (TarotApp : cinématique
//     fond → zoom → main → éventail → choix → révélation), mais totalPicks=1,
//     excludeIds = toutes les cartes déjà posées dans la consultation (aucune
//     lame ne retombe deux fois — re-vérifié côté serveur).
//   ClarifyRail — le rendu discret sous le tapis, dans le panneau
//     d'enchaînement : chaque lame de précision tirée (nom + miniature) à côté
//     des emplacements POINTILLÉS encore libres, qui se remplissent au fil des
//     questions (3 maximum).

import dynamic from 'next/dynamic';
import WaitOverlay from '@/components/wait-overlay';
import { useT } from '@/lib/i18n';
import { TAROT_CARDS } from '@/lib/tarot-data';
import { motion } from 'framer-motion';

const TarotApp = dynamic(() => import('@/app/components/tarot-app'), { ssr: false });

export function ClarifyDrawPortal({
  excludeIds,
  question,
  onPicked,
  onQuit,
  backgroundVideo,
  majorsOnly,
  analyzing,
  analysisReady,
  waitType,
  onDismiss,
}: {
  /** ids déjà posés dans la consultation (tapis + lames de précision). */
  excludeIds: number[];
  /** question enchaînée — rappelée en pastille pendant la pioche. */
  question: string;
  /** la lame est choisie → onPicked(id) ; le parent ferme le portail. */
  onPicked: (cardId: number) => void;
  onQuit: () => void;
  /** fond animé identique au tirage d'origine (5 Manuelles : vidéo). */
  backgroundVideo?: string;
  /** Même famille de jeu que le tirage d'origine (3 Cartes : 22 majeurs). */
  majorsOnly?: boolean;
  /** Lame posée, analyse en cours : le portail RESTE à l'écran et rejoue
   *  l'animation d'attente du tirage initial (WaitOverlay, vidéos d'analyse)
   *  par-dessus la révélation. */
  analyzing?: boolean;
  /** Réponse reçue : l'animation se retire en fondu, puis onDismiss ferme. */
  analysisReady?: boolean;
  /** Le type courant (tarot-3-cartes | tarot-5-c-manuelle) — sert à charger
   *  la même config d'attente que le tirage initial. */
  waitType: string;
  onDismiss?: () => void;
}) {
  const t = useT();
  return (
    <div className="fixed inset-0 z-[150]">
      <TarotApp
        totalPicks={1}
        spreadType="clarify"
        // Pioche dans la MÊME famille que le tirage d'origine ; la seule
        // différence est l'exclusion des cartes déjà posées (cohérence).
        majorsOnly={majorsOnly === true}
        title={t('follow.clarifyName')}
        question={question}
        excludeIds={excludeIds}
        inOverlay
        onQuit={analyzing ? undefined : onQuit}
        ctaHidden={analyzing === true}
        interpretLabel={t('follow.clarifyDraw')}
        positionLabels={[t('follow.clarifyName')]}
        positionIcons={['✦']}
        onInterpret={(ids) => onPicked(ids[0])}
        {...(backgroundVideo ? { backgroundVideo } : {})}
      />
      {analyzing && (
        // Même animation d'attente que le tirage initial (vidéos d'analyse,
        // messages rotatifs du corpus) — montée PAR-DESSUS le portail.
        <WaitOverlay
          type={waitType}
          ready={analysisReady === true}
          zClass="z-[165]"
          onVideoEnded={() => onDismiss?.()}
        />
      )}
    </div>
  );
}

/**
 * Rail des lames de précision — sous le tapis, dans la page d'interprétation.
 * Étiquette « Lame de précision », puis N cartes révélées + (3−N) emplacements
 * en pointillés (dash doré fin, aucun remplissage, aucun halo — la tradition
 * du vide qui attend). La dernière lame arrivée est mise en valeur (halo,
 * soulèvement, nom en doré) ; les précédentes restent lisibles, plus sobes.
 */
export function ClarifyRail({
  cards,
  total = 3,
  highlightLast = false,
}: {
  cards: number[]; // ids dans l'ordre des questions
  total?: number;   // 3 (tarot-3) ou 3 pour les deux — même règle
  highlightLast?: boolean;
}) {
  const t = useT();
  if (!Array.isArray(cards) || cards.length === 0) return null;
  const gold = '#DAA520';
  const empties = Math.max(0, total - cards.length);
  return (
    <div className="w-full mt-4" style={{ scrollMarginTop: '88px' }}>
      <p
        className="text-yellow-500/70 text-[10px] uppercase tracking-[0.2em] mb-2 text-center"
        style={{ fontFamily: 'var(--font-cinzel), serif' }}
      >
        {t('follow.clarifyName')}
      </p>
      <div className="flex justify-center items-start gap-2.5">
        {cards.map((id, i) => {
          const c = TAROT_CARDS.find((x) => x.id === id);
          const last = i === cards.length - 1 && highlightLast;
          return (
            <motion.div
              key={`${id}-${i}`}
              initial={last ? { opacity: 0, y: 18, scale: 0.92 } : false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="flex flex-col items-center gap-1 w-[72px] sm:w-[84px]"
            >
              <div
                className="relative w-full rounded-lg overflow-hidden"
                style={{
                  border: last ? `1.5px solid ${gold}` : '1px solid rgba(218,165,32,0.35)',
                  boxShadow: last
                    ? `0 0 18px ${gold}66, 0 6px 16px rgba(0,0,0,0.5)`
                    : '0 3px 10px rgba(0,0,0,0.45)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/cards/arcana/${id}.jpg`}
                  alt={c?.name || `Carte ${id}`}
                  className="w-full h-auto block"
                  style={{ aspectRatio: '764 / 1286' }}
                />
              </div>
              <span
                className="text-[9px] text-center leading-tight"
                style={{ color: last ? gold : 'rgba(240,230,211,0.75)', fontFamily: 'var(--font-cormorant), serif' }}
              >
                {c?.name || ''}
              </span>
            </motion.div>
          );
        })}
        {Array.from({ length: empties }, (_, k) => (
          <div key={`e${k}`} className="flex flex-col items-center gap-1 w-[72px] sm:w-[84px]">
            <div
              className="w-full rounded-lg"
              style={{
                aspectRatio: '764 / 1286',
                border: '1.5px dashed rgba(218,165,32,0.38)',
                background: 'rgba(218,165,32,0.04)',
              }}
              aria-hidden
            />
          </div>
        ))}
      </div>
    </div>
  );
}
