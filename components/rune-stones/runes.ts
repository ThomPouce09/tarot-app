// components/rune-stones/runes.ts
// Données typées du Futhark Ancien (Elder Futhark) — 24 runes traditionnelles.
// Chaque rune porte son symbole (Unicode Elder Futhark), et sa signification
// à l'endroit (upright) et à l'envers (merkstave / réversion).

export interface Rune {
  /** Nom de la rune (ex: Fehu). */
  name: string;
  /** Symbole Unicode Elder Futhark (ex: ᚠ). */
  symbol: string;
  /** Signification à l'endroit (tirage positif). */
  upright: string;
  /** Signification à l'envers (merkstave / réversion). */
  reversed: string;
}

export const ELDER_FUTHARK: Rune[] = [
  { name: 'Fehu', symbol: 'ᚠ', upright: 'Richesse, abondance, énergie et feu créateur.', reversed: 'Perte, avidité stérile ou possessions fuyantes.' },
  { name: 'Uruz', symbol: 'ᚢ', upright: 'Force vitale, courage, santé et vitalité brute.', reversed: 'Faiblesse, épuisement ou perte de courage.' },
  { name: 'Thurisaz', symbol: 'ᚦ', upright: 'Force defensive, limite, instinct et protection.', reversed: 'Danger, agression ou piège non vu.' },
  { name: 'Ansuz', symbol: 'ᚨ', upright: 'Parole, message, inspiration et sagesse des dieux.', reversed: 'Mensonge, manipulation ou silence trompeur.' },
  { name: 'Raidho', symbol: 'ᚱ', upright: 'Voyage, mouvement juste, ordre et chemin à suivre.', reversed: 'Dérive, plan perturbé ou mauvaise direction.' },
  { name: 'Kenaz', symbol: 'ᚲ', upright: 'Torche, connaissance, talent et révélation.', reversed: 'Obscurité, blocage créatif ou illusion.' },
  { name: 'Gebo', symbol: 'ᚷ', upright: 'Don, partage, union et équilibre des échanges.', reversed: 'Pas de réversion : cadeau sans contrepartie ou isolement.' },
  { name: 'Wunjo', symbol: 'ᚹ', upright: 'Joie, harmonie, accomplissement et bonne fortune.', reversed: 'Chagrin, discordance ou souhait entravé.' },
  { name: 'Hagalaz', symbol: 'ᚺ', upright: 'Glace, rupture, transformation inéluctable.', reversed: 'Pas de réversion : orage destructeur qui purifie.' },
  { name: 'Nauthiz', symbol: 'ᚾ', upright: 'Besoin, contrainte, patience et leçon nécessaire.', reversed: 'Privation, obsession ou blocage prolongé.' },
  { name: 'Isa', symbol: 'ᛁ', upright: 'Glace immobile, stagnation, focalisation et pause.', reversed: 'Pas de réversion : blocage total ou isolement.' },
  { name: 'Jera', symbol: 'ᛃ', upright: 'Année, cycles, récolte et fruits du temps.', reversed: 'Pas de réversion : mauvais timing ou attente vaine.' },
  { name: 'Eihwaz', symbol: 'ᛇ', upright: 'If, axe monde, résistance et vision profonde.', reversed: 'Pas de réversion : embûche ou doute persistant.' },
  { name: 'Perthro', symbol: 'ᛈ', upright: 'Mystère, destin, hasard et secrets révélés.', reversed: 'Pulsion, obsession cachée ou secret non dévoilé.' },
  { name: 'Algiz', symbol: 'ᛉ', upright: 'Élan, protection, connexion au sacré et défense.', reversed: 'Vulnérabilité, garde baissée ou danger.' },
  { name: 'Sowilo', symbol: 'ᛋ', upright: 'Soleil, succès, vitalité et victoire lumineuse.', reversed: 'Pas de réversion : échec passager ou fausse lumière.' },
  { name: 'Tiwaz', symbol: 'ᛏ', upright: 'Týr, justice, courage guerrier et victoire.', reversed: 'Conflit stérile, sacrifice vain ou injustice.' },
  { name: 'Berkano', symbol: 'ᛒ', upright: 'Bouleau, croissance, naissance et renouveau.', reversed: 'Stagnation, blocage féminin ou environnement toxique.' },
  { name: 'Ehwaz', symbol: 'ᛖ', upright: 'Cheval, mouvement, confiance et progrès partagé.', reversed: 'Désaccord, trajet interrompu ou instabilité.' },
  { name: 'Mannaz', symbol: 'ᛗ', upright: 'Homme, soi, communauté et conscience de soi.', reversed: 'Ombre, egocentrisme ou incompréhension d’autrui.' },
  { name: 'Laguz', symbol: 'ᛚ', upright: 'Eau, flux, intuition et élan émotionnel.', reversed: 'Submersion, peur irrationnelle ou perte de sens.' },
  { name: 'Ingwaz', symbol: 'ᛜ', upright: 'Ing, fécondité, repos et travail intérieur achevé.', reversed: 'Pas de réversion : blocage de l’éclosion ou attente.' },
  { name: 'Dagaz', symbol: 'ᛞ', upright: 'Jour, aube, percée et transformation radicale.', reversed: 'Pas de réversion : ténèbre passagère avant l’aube.' },
  { name: 'Othala', symbol: 'ᛟ', upright: 'Héritage, racines, foyer et transmission.', reversed: 'Rupture, exclusion ou attachement toxique au passé.' },
];

export type RuneLayout = 'horizontal' | 'cross' | 'hammer' | 'vertical';

/** Tire `count` runes aléatoires (sans remise) parmi les 24 du Futhark. */
export function drawRunes(count: number): Rune[] {
  const pool = [...ELDER_FUTHARK];
  const out: Rune[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}
