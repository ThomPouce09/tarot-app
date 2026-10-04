// components/astro-dice/names.ts
// Tables de noms des faces (planètes / signes / maisons) en 4 langues.
// Module neutre (aucune dépendance UI) : utilisé par _shared (ResultLine), la
// constellation et les modales — évite d'embarquer _shared dans AstroDiceCup.
// PLANET_NAMES / SIGN_NAMES restent les maps FR (utilisées telles quelles en
// français) ; planetName/signName/houseName localisent selon la langue runtime.

import type { Lang } from '@/lib/i18n';

type Variants = { fr: string; en: string; es: string; hi: string };

export const PLANET_NAMES: Record<string, string> = {
  '☉': 'Soleil', '☽': 'Lune', '☿': 'Mercure', '♀': 'Vénus', '♂': 'Mars',
  '♃': 'Jupiter', '♄': 'Saturne', '♅': 'Uranus', '♆': 'Neptune', '♇': 'Pluton',
  '☊': 'Nœud Nord', '☋': 'Nœud Sud',
};
export const SIGN_NAMES: Record<string, string> = {
  '♈': 'Bélier', '♉': 'Taureau', '♊': 'Gémeaux', '♋': 'Cancer', '♌': 'Lion',
  '♍': 'Vierge', '♎': 'Balance', '♏': 'Scorpion', '♐': 'Sagittaire',
  '♑': 'Capricorne', '♒': 'Verseau', '♓': 'Poissons',
};

const PLANET_L10N: Record<string, Variants> = {
  '☉': { fr: 'Soleil', en: 'Sun', es: 'Sol', hi: 'सूर्य' },
  '☽': { fr: 'Lune', en: 'Moon', es: 'Luna', hi: 'चंद्र' },
  '☿': { fr: 'Mercure', en: 'Mercury', es: 'Mercurio', hi: 'बुध' },
  '♀': { fr: 'Vénus', en: 'Venus', es: 'Venus', hi: 'शुक्र' },
  '♂': { fr: 'Mars', en: 'Mars', es: 'Marte', hi: 'मंगल' },
  '♃': { fr: 'Jupiter', en: 'Jupiter', es: 'Júpiter', hi: 'बृहस्पति' },
  '♄': { fr: 'Saturne', en: 'Saturn', es: 'Saturno', hi: 'शनि' },
  '♅': { fr: 'Uranus', en: 'Uranus', es: 'Urano', hi: 'यूरानस' },
  '♆': { fr: 'Neptune', en: 'Neptune', es: 'Neptuno', hi: 'नेपच्यून' },
  '♇': { fr: 'Pluton', en: 'Pluto', es: 'Plutón', hi: 'प्लूटो' },
  '☊': { fr: 'Nœud Nord', en: 'North Node', es: 'Nodo Norte', hi: 'राहु' },
  '☋': { fr: 'Nœud Sud', en: 'South Node', es: 'Nodo Sur', hi: 'केतु' },
};

const SIGN_L10N: Record<string, Variants> = {
  '♈': { fr: 'Bélier', en: 'Aries', es: 'Aries', hi: 'मेष' },
  '♉': { fr: 'Taureau', en: 'Taurus', es: 'Tauro', hi: 'वृषभ' },
  '♊': { fr: 'Gémeaux', en: 'Gemini', es: 'Géminis', hi: 'मिथुन' },
  '♋': { fr: 'Cancer', en: 'Cancer', es: 'Cáncer', hi: 'कर्क' },
  '♌': { fr: 'Lion', en: 'Leo', es: 'Leo', hi: 'सिंह' },
  '♍': { fr: 'Vierge', en: 'Virgo', es: 'Virgo', hi: 'कन्या' },
  '♎': { fr: 'Balance', en: 'Libra', es: 'Libra', hi: 'तुला' },
  '♏': { fr: 'Scorpion', en: 'Scorpio', es: 'Escorpio', hi: 'वृश्चिक' },
  '♐': { fr: 'Sagittaire', en: 'Sagittarius', es: 'Sagitario', hi: 'धनु' },
  '♑': { fr: 'Capricorne', en: 'Capricorn', es: 'Capricornio', hi: 'मकर' },
  '♒': { fr: 'Verseau', en: 'Aquarius', es: 'Acuario', hi: 'कुंभ' },
  '♓': { fr: 'Poissons', en: 'Pisces', es: 'Piscis', hi: 'मीन' },
};

const HOUSE_KIND_L10N: Variants = { fr: 'Maison', en: 'House', es: 'Casa', hi: 'भाव' };

/** Nom localisé d'une planète (glyphe → nom dans lang, fallback FR). */
export function planetName(glyph: string, lang: Lang): string {
  return PLANET_L10N[String(glyph)]?.[lang] ?? PLANET_NAMES[String(glyph)] ?? String(glyph);
}

/** Nom localisé d'un signe (glyphe → nom dans lang, fallback FR). */
export function signName(glyph: string, lang: Lang): string {
  return SIGN_L10N[String(glyph)]?.[lang] ?? SIGN_NAMES[String(glyph)] ?? String(glyph);
}

/** « Maison 5 » localisé : « House 5 » / « Casa 5 » / « भाव ५ »… */
export function houseName(house: string | number, lang: Lang): string {
  if (lang === 'hi') return `${HOUSE_KIND_L10N.hi} ${toDevanagari(String(house))}`;
  return `${HOUSE_KIND_L10N[lang] ?? HOUSE_KIND_L10N.fr} ${house}`;
}

/** Libellé du dé (Planète/Signe/Maison) localisé. */
export function dieKindLabel(kind: 'planet' | 'sign' | 'house', lang: Lang): string {
  if (kind === 'planet') return { fr: 'Planète', en: 'Planet', es: 'Planeta', hi: 'ग्रह' }[lang];
  if (kind === 'sign') return { fr: 'Signe', en: 'Sign', es: 'Signo', hi: 'राशि' }[lang];
  return HOUSE_KIND_L10N[lang] ?? HOUSE_KIND_L10N.fr;
}

function toDevanagari(num: string): string {
  const map: Record<string, string> = { '0': '०', '1': '१', '2': '२', '3': '३', '4': '४', '5': '५', '6': '६', '7': '७', '8': '८', '9': '९' };
  return num.split('').map((c) => map[c] ?? c).join('');
}
