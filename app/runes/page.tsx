'use client';

// app/runes/page.tsx — Niveau 1 : Tableau de bord des Runes Scandinaves

import dynamic from 'next/dynamic';
import YiSlideNav from '@/components/yi-slide-nav';
import {
  RuneBackground,
  RuneTitle,
  RuneTile,
  BackToRunes,
} from './_shared';

export default function RunesHub() {
  return (
    <RuneBackground>
      <YiSlideNav />
      <RuneTitle
        title="Runes Scandinaves : Interroger le Futhark"
        subtitle="Le Futhark Ancien, 24 runes gravées sur pierre, révèle les courants du destin."
      />

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 px-4 pb-4 sm:grid-cols-3">
        <RuneTile
          title="Le Fil des Nornes"
          description="Comprendre le passé, saisir le présent et tisser l'avenir."
          href="/runes/nornes"
        />
        <RuneTile
          title="Le Marteau de Mjölnir"
          description="Briser un obstacle et trouver la force d'agir."
          href="/runes/mjolnir"
        />
        <RuneTile
          title="Les Racines d'Yggdrasil"
          description="Un bilan profond pour s'ancrer et grandir."
          href="/runes/yggdrasil"
        />
      </div>

      <BackToRunes />
    </RuneBackground>
  );
}
