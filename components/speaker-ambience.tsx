'use client';

// components/speaker-ambience.tsx
// Enceinte globale (3 modes : blanc = voix+effets · orange = effets seuls ·
// rouge = tout coupé) présente sur TOUTES les pages, y compris les sous-pages
// des 4 univers et « Mon espace ». Pilote les mêmes préférences que celle de
// la landing (lib/sounds → localStorage), donc l'état est partagé partout.
// La landing garde SA propre instance (positionnée sous son menu à elle) :
// on ne rend rien sur '/' pour éviter l'empilement de deux enceintes.

import { usePathname } from 'next/navigation';
import SpeakerToggle from '@/components/speaker-toggle';

export default function SpeakerAmbience() {
  const pathname = usePathname();
  if (!pathname || pathname === '/' || pathname === '/index.html') return null;
  const dash = pathname.startsWith('/dashboard');
  if (dash) return null; // « Mon espace » : la gestion du son vit déjà dans Préférences
  return <SpeakerToggle />;
}
