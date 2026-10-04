// lib/tarot-data-i18n.ts — Noms des 78 cartes + libellés de position en 4 langues.
// GÉNÉRÉ par tmp_i18n_gen_cards.cjs depuis tmp/i18n/cards_es_hi.json — ne pas éditer à la main.

import type { Lang } from './i18n';

export type NameVariants = { es: string; hi: string };

/** Majors : index = id du tarot (0-21). */
export const MAJOR_NAMES_I18N: (NameVariants | null)[] = [
  { es: "El Loco", hi: "विदूषक" },
  { es: "El Mago", hi: "जादूगर" },
  { es: "La Sacerdotisa", hi: "उच्चयाजिका" },
  { es: "La Emperatriz", hi: "सम्राज्ञी" },
  { es: "El Emperador", hi: "सम्राट" },
  { es: "El Sumo Sacerdote", hi: "महापुजारी" },
  { es: "Los Enamorados", hi: "प्रेमी जोड़े" },
  { es: "El Carro", hi: "रथ" },
  { es: "La Justicia", hi: "न्याय" },
  { es: "El Ermitaño", hi: "तपस्वी" },
  { es: "La Rueda de la Fortuna", hi: "भाग्य का पहिया" },
  { es: "La Fuerza", hi: "शक्ति" },
  { es: "El Colgado", hi: "लटका हुआ" },
  { es: "La Muerte", hi: "मृत्यु" },
  { es: "La Templanza", hi: "संयम" },
  { es: "El Diablo", hi: "शैतान" },
  { es: "La Torre", hi: "मिनार" },
  { es: "La Estrella", hi: "तारा" },
  { es: "La Luna", hi: "चंद्रमा" },
  { es: "El Sol", hi: "सूर्य" },
  { es: "El Juicio", hi: "पुनरुत्थान" },
  { es: "El Mundo", hi: "संसार" },
];

/** Minors : suite FR -> 14 noms (ordre : As..Dix, Valet, Cavalier, Reine, Roi). */
export const MINOR_NAMES_I18N: Record<string, NameVariants[]> = {
  "Bâtons": [
    { es: "As de Bastos", hi: "दंड के इक्का" },
    { es: "Dos de Bastos", hi: "दंड के दो" },
    { es: "Tres de Bastos", hi: "दंड के तीन" },
    { es: "Cuatro de Bastos", hi: "दंड के चार" },
    { es: "Cinco de Bastos", hi: "दंड के पाँच" },
    { es: "Seis de Bastos", hi: "दंड के छह" },
    { es: "Siete de Bastos", hi: "दंड के सात" },
    { es: "Ocho de Bastos", hi: "दंड के आठ" },
    { es: "Nueve de Bastos", hi: "दंड के नौ" },
    { es: "Diez de Bastos", hi: "दंड के दस" },
    { es: "Sota de Bastos", hi: "दंड के सोट" },
    { es: "Caballero de Bastos", hi: "दंड के सवार" },
    { es: "Reina de Bastos", hi: "दंड के रानी" },
    { es: "Rey de Bastos", hi: "दंड के राजा" },
  ],
  "Coupes": [
    { es: "As de Copas", hi: "कप के इक्का" },
    { es: "Dos de Copas", hi: "कप के दो" },
    { es: "Tres de Copas", hi: "कप के तीन" },
    { es: "Cuatro de Copas", hi: "कप के चार" },
    { es: "Cinco de Copas", hi: "कप के पाँच" },
    { es: "Seis de Copas", hi: "कप के छह" },
    { es: "Siete de Copas", hi: "कप के सात" },
    { es: "Ocho de Copas", hi: "कप के आठ" },
    { es: "Nueve de Copas", hi: "कप के नौ" },
    { es: "Diez de Copas", hi: "कप के दस" },
    { es: "Sota de Copas", hi: "कप के सोट" },
    { es: "Caballero de Copas", hi: "कप के सवार" },
    { es: "Reina de Copas", hi: "कप के रानी" },
    { es: "Rey de Copas", hi: "कप के राजा" },
  ],
  "Épées": [
    { es: "As de Espadas", hi: "तलवार के इक्का" },
    { es: "Dos de Espadas", hi: "तलवार के दो" },
    { es: "Tres de Espadas", hi: "तलवार के तीन" },
    { es: "Cuatro de Espadas", hi: "तलवार के चार" },
    { es: "Cinco de Espadas", hi: "तलवार के पाँच" },
    { es: "Seis de Espadas", hi: "तलवार के छह" },
    { es: "Siete de Espadas", hi: "तलवार के सात" },
    { es: "Ocho de Espadas", hi: "तलवार के आठ" },
    { es: "Nueve de Espadas", hi: "तलवार के नौ" },
    { es: "Diez de Espadas", hi: "तलवार के दस" },
    { es: "Sota de Espadas", hi: "तलवार के सोट" },
    { es: "Caballero de Espadas", hi: "तलवार के सवार" },
    { es: "Reina de Espadas", hi: "तलवार के रानी" },
    { es: "Rey de Espadas", hi: "तलवार के राजा" },
  ],
  "Deniers": [
    { es: "As de Oros", hi: "सिक्के के इक्का" },
    { es: "Dos de Oros", hi: "सिक्के के दो" },
    { es: "Tres de Oros", hi: "सिक्के के तीन" },
    { es: "Cuatro de Oros", hi: "सिक्के के चार" },
    { es: "Cinco de Oros", hi: "सिक्के के पाँच" },
    { es: "Seis de Oros", hi: "सिक्के के छह" },
    { es: "Siete de Oros", hi: "सिक्के के सात" },
    { es: "Ocho de Oros", hi: "सिक्के के आठ" },
    { es: "Nueve de Oros", hi: "सिक्के के नौ" },
    { es: "Diez de Oros", hi: "सिक्के के दस" },
    { es: "Sota de Oros", hi: "सिक्के के सोट" },
    { es: "Caballero de Oros", hi: "सिक्के के सवार" },
    { es: "Reina de Oros", hi: "सिक्के के रानी" },
    { es: "Rey de Oros", hi: "सिक्के के राजा" },
  ],
};

/** Libellés de position (sélecteurs passés au composant de tirage). */
export const POSITION_LABELS_3: Record<Lang, string[]> = {
  fr: ["Passé","Présent","Avenir"],
  en: ["Past","Present","Future"],
  es: ["Pasado","Presente","Futuro"],
  hi: ["अतीत","वर्तमान","भविष्य"],
};

export const POSITION_LABELS_CROSS: Record<Lang, string[]> = {
  fr: ["L'Orient","L'Occident","Le Sommet","La Base","La Synthèse"],
  en: ["The Orient","The Occident","The Summit","The Base","The Synthesis"],
  es: ["Oriente","Occidente","La Cima","La Base","La Síntesis"],
  hi: ["पूर्व","पश्चिम","शिखर","आधार","संक्षेप"],
};

export const NORNES_POSITIONS: Record<Lang, string[]> = {
  fr: ["Urd — Le Passé","Verdandi — Le Présent","Skuld — L'Avenir","Conseil d'Odin"],
  en: ["Urd — The Past","Verdandi — The Present","Skuld — The Future","Odin's Counsel"],
  es: ["Urd — El Pasado","Verdandi — El Presente","Skuld — El Futuro","Consejo de Odín"],
  hi: ["उर्द्र — अतीत","वर्डान्दी — वर्तमान","स्कल्ड — भविष्य","ओदिन का परामर्श"],
};

/** Nom localisé d'une carte (id 0-77). EN : via card.nameEn existant (non passé ici).
 *  lang fr → fr ; es/hi → table ; en → fallback fr (l'appelant utilise nameEn). */
export function tarotNameI18n(id: number, fr: string, lang: Lang, nameEn?: string): string {
  if (lang === 'fr') return fr;
  if (lang === 'en') return nameEn || fr;
  const pick = (t: { es: string; hi: string } | null | undefined) => (lang === 'es' ? t?.es : t?.hi) || fr;
  if (id <= 21) return pick(MAJOR_NAMES_I18N[id]);
  const suitIdx = Math.floor((id - 22) / 14);
  const cardIdx = (id - 22) % 14;
  const suits = ['Bâtons', 'Coupes', 'Épées', 'Deniers'];
  return pick(MINOR_NAMES_I18N[suits[suitIdx]]?.[cardIdx]);
}
