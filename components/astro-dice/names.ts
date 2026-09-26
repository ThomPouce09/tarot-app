// components/astro-dice/names.ts
// Tables de noms FR des faces (planètes / signes / maisons). Module neutre
// (aucune dépendance UI) : utilisé par _shared (ResultLine), la constellation
// et les modales — évite d'embarquer _shared dans AstroDiceCup.

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
