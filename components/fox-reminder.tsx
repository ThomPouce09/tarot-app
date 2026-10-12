'use client';

// Le renard du Profil — irruption SPONTANÉE sur la landing (aucun clic sur une
// orbe) : après ~1,8 s, si la session a ≥ 3 tirages et son Profil oracle vide,
// le message « On se connaît un peu… » s'affiche avec magic-4, en attendant
// que les orbes aient fini leur propre cycle.
//
// Règles (lib/profile.ts) : revient d'office au bout de 3 jours OU PLUS tant
// que le profil reste vide ; 2 refus = silence définitif ; profil rempli =
// silence définitif — même cycle en dev qu'en prod. APK : requêtes via api().

import { useEffect, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { playSound } from '@/lib/sounds';
import { api } from '@/lib/api-client';
import CreaturePopup, { isCreaturePopupOpen } from './creature-popup';

type FoxData = {
  creature: { name: string; image: string; color: string | null };
  text: string;
  category: string;
  lang: string;
};

type Props = { /** Délai d'irruption (ms) — laisser la page respirer avant. */ delayMs?: number };

function readEmailLocal(): string {
  try {
    return JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email ?? '';
  } catch {
    return '';
  }
}

export default function FoxReminder({ delayMs = 1800 }: Props) {
  const lang = useLang();
  const [fox, setFox] = useState<FoxData | null>(null);

  // NB : pas de garde « une fois par page » en ref — en dev/StrictMode chaque
  // effet est montés-démontés une fois ; le timer + le drapeau stop suffisent
  // (et un vrai doublon d'irruption est impossible : setFox remplace, et le
  // popup se ferme avant tout nouveau déclenchement).
  useEffect(() => {
    const email = readEmailLocal();
    if (!email) return; // visiteur non connecté : rien à rappeler

    let stop = false;   // cleanup d'un remontage StrictMode : on ne touche plus l'état
    const t = setTimeout(async () => {
      try {
        const res = await api(
          `/api/profile-prompt?email=${encodeURIComponent(email)}&lang=${lang}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (stop || !data?.show || !data?.creature) return;

        // Ne jamais passer SUR une créature déjà affichée : on attend qu'elle
        // finisse (le renard a tout son temps, c'est un rappel, pas un hold-up).
        const waitOrbes = async () => {
          for (let i = 0; i < 60 && isCreaturePopupOpen(); i++) {
            await new Promise((r) => setTimeout(r, 2000));
          }
        };
        void waitOrbes().then(() => {
          if (!stop) setFox({
            creature: data.creature, text: data.message.text,
            category: data.message.category, lang,
          });
        });
      } catch {
        /* hors-ligne ou gate : le rappel n'est jamais critique */
      }
    }, delayMs);

    return () => {
      stop = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!fox) return null;

  return (
    <CreaturePopup
      // Le renard joue lui-même magic-4 à son apparition : la créature passe
      // par playSound('magic-4') ci-dessous.
      data={fox}
      onAppear={() => playSound('magic-4', 0.8)}
      onClose={() => {
        setFox(null);
        // Vu = l'horloge de 3 jours repart (refus déjà horodaté par « Pas
        // maintenant »/clic dehors ; en dev, rien n'est écrit).
        const email = readEmailLocal();
        if (email) {
          void api('/api/profile-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, action: 'seen' }),
          }).catch(() => {});
        }
      }}
    />
  );
}
