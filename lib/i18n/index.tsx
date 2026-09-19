'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initPush } from '@/lib/push';

export type Lang = 'fr' | 'en' | 'es' | 'zh';
const VALID_LANGS: Lang[] = ['fr', 'en', 'es', 'zh'];

// Les chaînes UI binaires ({fr, en}) vivent encore en ContentLang : tant que
// es/zh ne sont pas traduits (lib/i18n/ui.ts en cours de remplissage), ils
// retombent sur fr. À éliminer quand les entrées es/zh existent partout.
export type ContentLang = 'fr' | 'en';
export const contentLang = (l: Lang): ContentLang => (l === 'en' ? 'en' : 'fr');

// Dictionnaire UI : clé sémantique stable -> { fr, en }
// Ajouter/modifier un libellé = une seule entrée ici. Fallback fr automatique.
import { DICT } from './ui';

const LangCtx = createContext<Lang>('fr');
const SetLangCtx = createContext<(l: Lang) => void>(() => {});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  // Source de vérité : localStorage 'tarot_prefs' (langue choisie dans Préférences).
  // Si aucune préférence sauvegardée, on détecte la langue de l'appareil (navigator.language).
  // Lu APRÈS montage (pas au 1er render) pour éviter un mismatch d'hydratation :
  // le serveur rend toujours 'fr', le client aussi au 1er render, puis on applique
  // la langue (sauvegardée OU appareil). Flash FR→EN imperceptible, mais aucune erreur React.
  useEffect(() => {
    initPush();
    try {
      const raw = localStorage.getItem('tarot_prefs');
      if (raw) {
        const prefs = JSON.parse(raw);
        if (VALID_LANGS.includes(prefs.language)) {
          setLangState(prefs.language as Lang);
          return;
        }
      }
      // Pas de préférence explicite -> langue de l'appareil
      const nav = navigator.language?.slice(0, 2).toLowerCase();
      if (nav === 'en') setLangState('en');
      else if (nav === 'es') setLangState('es');
      else if (nav === 'zh') setLangState('zh');
      // sinon reste 'fr' par défaut
    } catch {}
  }, []);

  // Resync si la langue change ailleurs (autre onglet / Préférences)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'tarot_prefs' && e.newValue) {
        try {
          const prefs = JSON.parse(e.newValue);
          if (prefs.language === 'en' || prefs.language === 'fr') setLangState(prefs.language as Lang);
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      const raw = localStorage.getItem('tarot_prefs');
      const prefs = raw ? JSON.parse(raw) : {};
      prefs.language = l;
      localStorage.setItem('tarot_prefs', JSON.stringify(prefs));
    } catch {}
  };

  return (
    <LangCtx.Provider value={lang}>
      <SetLangCtx.Provider value={setLang}>{children}</SetLangCtx.Provider>
    </LangCtx.Provider>
  );
}

export function useLang(): Lang {
  return useContext(LangCtx);
}

export function useSetLang(): (l: Lang) => void {
  return useContext(SetLangCtx);
}

// t(key) -> chaîne dans la langue courante (fallback fr -> clé)
export function useT() {
  const lang = useLang();
  return (key: string): string => {
    const entry = (DICT as Record<string, Partial<Record<Lang, string>>>)[key];
    if (!entry) {
      if (process.env.NODE_ENV !== 'production') console.warn('[i18n] missing key:', key);
      return key;
    }
    return entry[lang] ?? entry.fr ?? key;
  };
}
