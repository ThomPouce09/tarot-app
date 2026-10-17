'use client';



// components/tour-reminder.tsx — Le même renard que celui du rappel Profil,

// mais pour le TUTORIEL : sur la landing, si le compte n'a pas vu le tour

// « Le hall des Etoiles » jusqu'à son avant-dernière page (flags 'tour' /

// 'tour_end' absents), il propose une seule fois de le reprendre.

// Non lié au serveur : les flags vivent dans User.seenTutorials (lib/tutorials).

import { useEffect, useState } from 'react';

import { useT } from '@/lib/i18n';

import { playSound } from '@/lib/sounds';

import { hydrateTutorials, isTutorialSeen, markTutorialSeen, TUTS_EVENT } from '@/lib/tutorials';

const FOX_NAMES: Record<'fr' | 'en' | 'es' | 'hi', string> = { fr: 'Le renard', en: 'The fox', es: 'El zorro', hi: 'लोमड़ी' };

import { useLang } from '@/lib/i18n';

import CreaturePopup, { isCreaturePopupOpen } from './creature-popup';



type Props = { delayMs?: number };



function readEmailLocal(): string {

  try {

    return JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email ?? '';

  } catch {

    return '';

  }

}



export default function TourReminder({ delayMs = 4500 }: Props) {

  const t = useT();

  const lang = useLang();

  const [fox, setFox] = useState<{ creature: { name: string; image: string; color: string | null }; text: string; category: string; lang: string } | null>(null);



  useEffect(() => {

    if (!readEmailLocal()) return; // pas connecté : rien à proposer

    let stop = false;

    const LK = 'tarot_tour_renard_shown';

    const check = () => {

      try {

        // Déjà proposé une fois, ou tour lu jusqu'au bout → silence.

        if (localStorage.getItem(LK)) return;

        if (isTutorialSeen('tour_end')) return;
        // Le tour n'est proposé par le renard que s'il a été FERMÉ de
        // bonne foi avant l'avant-dernière page ('tour_stopped'). Sinon (tour
        // jamais fermé), l'auto-lecture du tour reste prioritaire.
        if (!isTutorialSeen('tour_stopped')) return;

      } catch { return; }

      const t0 = setTimeout(async () => {

        try {

          // Jamais par-dessus une autre créature (rappel profil, orbes…).

          for (let i = 0; i < 40 && isCreaturePopupOpen(); i++) await new Promise((r) => setTimeout(r, 1500));

          if (stop) return;

          const L = (lang === 'en' ? 'en' : lang === 'es' ? 'es' : lang === 'hi' ? 'hi' : 'fr') as 'fr' | 'en' | 'es' | 'hi';

          setFox({

            creature: { name: FOX_NAMES[L], image: '/images/creatures/renard-rappel-profil.png', color: null },

            text: t('tourRenard.text'),

            category: 'tour_prompt',

            lang: L,

          });

          localStorage.setItem(LK, '1');

        } catch { /* rien de critique */ }

      }, delayMs);

      return () => clearTimeout(t0);

    };

    hydrateTutorials().then(() => { check(); try { window.addEventListener(TUTS_EVENT, check); } catch {} });

    return () => { stop = true; try { window.removeEventListener(TUTS_EVENT, check); } catch {} };

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, []);



  if (!fox) return null;

  return (

    <CreaturePopup

      data={fox}

      onAppear={() => playSound('magic-4', 0.8)}

      onClose={() => {

        setFox(null);

        // « Passer » vaut refus du rappel : plus de relance automatique.

        markTutorialSeen('tour_reminder_refused');

      }}

      onAccept={() => {

        // Relance le tour : on retire le drapeau d'arrêt et on recharge la

        // landing (le tour est monté dans layout.tsx et ne se réarme qu'en

        // rechargement complet — règle du projet).

        markTutorialSeen('tour_stopped');

        window.location.assign('/?tour=1');

      }}

    />

  );

}

