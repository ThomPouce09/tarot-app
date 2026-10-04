'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initPush } from '@/lib/push';

export type Lang = 'fr' | 'en' | 'es' | 'hi';
const VALID_LANGS: Lang[] = ['fr', 'en', 'es', 'hi'];

// Les chaînes UI binaires ({fr, en}) vivent encore en ContentLang : tant que
// es/hi ne sont pas traduits (lib/i18n/ui.ts en cours de remplissage), ils
// retombent sur fr. À éliminer quand les entrées es/hi existent partout.
export type ContentLang = 'fr' | 'en';
export const contentLang = (l: Lang): ContentLang => (l === 'en' ? 'en' : 'fr');

// Sélecteur 4-langues pour les libellés codés en dur (remplace progressivement
// les ternaires `lang === 'en' ? EN : FR`). Usage :
//   pick4(fr, en, es, hi)(lang)  — ou pick4T({fr,en,es,hi})(lang)
// Fallback : manque → fr (jamais de trou d'affichage).
export function pick4(fr: string, en: string, es?: string, hi?: string) {
  return (lang: Lang): string =>
    lang === 'fr' ? fr
    : lang === 'en' ? (en || fr)
    : lang === 'es' ? (es || fr)
    : (hi || fr);
}
export function pick4T(t: { fr: string; en?: string; es?: string; hi?: string }) {
  return (lang: Lang): string => pick4(t.fr, t.en ?? t.fr, t.es, t.hi)(lang);
}
// Contenu bilingue FR/EN existant ({fr,en} en base, prompt IA, etc.) : version
// locale d'un objet {fr,en} selon la langue — es/hi retombe sur fr tant que le
// contenu n'est pas scellé dans ces langues (schéma DB actuel : textFr/textEn).
export const contentOf = (obj: { fr: string; en?: string | null }, lang: Lang): string =>
  lang === 'en' ? (obj.en || obj.fr) : obj.fr;

// Contenu statique 4 langues injecté dans le code ({fr,en,es?,hi?}) :
// pickContent choisit la bonne variante, retombe sur fr si absente.
// À préférer à obj[contentLang(lang)] pour tout objet ENRICHI es/hi dans le
// code (les contenus stockés en base {fr,en} gardent contentLang).
export const pickContent = (obj: { fr: string; en?: string | null; es?: string | null; hi?: string | null }, lang: Lang): string =>
  lang === 'en' ? (obj.en || obj.fr)
  : lang === 'es' ? (obj.es || obj.fr)
  : lang === 'hi' ? (obj.hi || obj.fr)
  : obj.fr;

// Dictionnaire UI : clé sémantique stable -> { fr, en }
// Ajouter/modifier un libellé = une seule entrée ici. Fallback fr automatique.
import { DICT } from './ui';

// Langue runtime globale — miroir de l'état du LanguageProvider (mis à jour à
// chaque changement, et le provider re-rend tout l'arbre → les tr() dans les
// corps de rendu se recalculent). Permet de localiser des littéraux HORS portée
// de hook (défauts de props, tableaux de données, modules) sans casser l'SSR :
// le serveur rend toujours 'fr', exactement comme useLang au 1er render.
let runtimeLang: Lang = 'fr';
export const getRuntimeLang = (): Lang => runtimeLang;
export const setRuntimeLang = (l: Lang) => { runtimeLang = l; };
// tr = pick4 en langue runtime : tr('FR', 'EN', 'ES', 'HI') → string localisée.
export function tr(fr: string, en: string, es?: string, hi?: string): string {
  return pick4(fr, en, es, hi)(runtimeLang);
}

const LangCtx = createContext<Lang>('fr');
const SetLangCtx = createContext<(l: Lang) => void>(() => {});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');
  setRuntimeLang(lang); // miroir global (voir tr())

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
      else if (nav === 'hi') setLangState('hi');
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
