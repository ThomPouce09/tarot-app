// components/astro-dice/meanings.ts
// Significations statiques des trois dés du zodiaque (analyse immédiate,
// 100% client, aucun appel réseau). Textes courts et évocateurs, ton
// d'oracle bienveillant, pour « faire patienter » pendant le chargement LLM.
//
// Clés : le glyphe (planète/signe) ou le numéro de maison (string).

import type { DieKind } from './glyphs';

/** Significations du dé des Planètes (12 glyphes). */
export const PLANET_MEANINGS: Record<string, string> = {
  '☉':
    "Le Soleil éclaire ta véritable identité. Il t'invite à rayonner, à prendre ta place et à avancer avec confiance. C'est le cœur qui se rappelle à toi : ose être toi-même, la lumière est déjà en toi.",
  '☽':
    "La Lune veille sur tes émotions et tes racines. Elle murmure de ralentir, d'écouter ton ressenti et de honorer tes besoins les plus doux. Ton intuition est ta boussole : fais-lui confiance.",
  '☿':
    "Mercure aiguise ton esprit et ta parole. Il encourage la curiosité, les échanges et la clarté. Une idée neuve se forme : exprime-la, écris-la, partage-la sans crainte.",
  '♀':
    "Vénus ouvre les portes du cœur et des plaisirs simples. Elle te rappelle d'aimer et de te laisser aimer, de cultiver la beauté autour de toi. La douceur est une force, pas une faiblesse.",
  '♂':
    "Mars réveille ton courage et ton élan. Il pousse à l'action, à défendre ce qui compte et à transformer l'énergie en mouvement. Ose te mettre en marche : l'élan naît du premier pas.",
  '♃':
    "Jupiter déploie l'horizon et la chance. Il élargit tes perspectives et t'invite à grandir, apprendre, espérer plus grand. Une porte s'ouvre : avance vers elle avec foi.",
  '♄':
    "Saturne bâtit sur la durée. Il demande patience, discipline et responsabilité, mais garantit des fondations solides. Ce qui demande effort aujourd'hui deviendra ta force demain.",
  '♅':
    "Uranus surprend et libère. Il secoue la routine pour réveiller ton originalité et ton besoin de liberté. Un changement inattendu est une invitation à renouer avec toi-même.",
  '♆':
    "Neptune dissolves les frontières et éveille l'imaginaire. Il invite à la rêverie, à la compassion et au lâcher-prise. Écoute tes rêves : ils portent un message subtil.",
  '♇':
    "Pluton transforme par le profond. Il accompagne les fins nécessaires et les renaissance qui suivent. Ce que tu laisses partir te rend plus entier : laisse agir le renouveau.",
  '☊':
    "Le Nœud Nord indique ta direction d'âme. Il pointe la leçon à intégrer pour avancer, souvent au-delà de tes habitudes. Suis cette piste : elle t'aligne avec ton destin.",
  '☋':
    "Le Nœud Sud évoque tes dons hérités et tes automatismes du passé. Il rappelle ce que tu maîtrises déjà — et dont il faut parfois lâcher la trop forte emprise pour évoluer.",
};

/** Significations du dé des Signes (12 glyphes). */
export const SIGN_MEANINGS: Record<string, string> = {
  '♈':
    "Bélier, le pionnier de feu. Il donne l'audace de démarrer, l'instinct du premier mouvement. Agis avec spontanéité : ton énergie est un démarreur, pas une suite.",
  '♉':
    "Taureau, l'ancre de terre. Il enracine, rassure et fait durer. Cultive la stabilité et les plaisirs simples : la constance est ta manière d'avancer.",
  '♊':
    "Gémeaux, le messager d'air. Il multiplie les idées, les liens et les échanges. Reste curieux, dialogue, mais ancore une idée avant de bondir vers la suivante.",
  '♋':
    "Cancer, le gardien d'eau. Il protège le foyer et les émotions vraies. Écoute ton besoin de sécurité et de proximité : c'est de là que tu agis le mieux.",
  '♌':
    "Lion, le cœur de feu. Il donne chaleur, fierté et générosité. Brille à ta juste mesure et entraîne les autres : ta présence est un don.",
  '♍':
    "Vierge, l'artisan de terre. Elle affûte le détail, le soin et l'utilité. Apporte de l'ordre et de la justesse : le petit geste bien fait porte loin.",
  '♎':
    "Balance, l'équilibriste d'air. Elle cherche harmonie, lien et justice. Cherche le point d'accord : la mesure juste apaise et fait avancer ensemble.",
  '♏':
    "Scorpion, la profondeur d'eau. Il sonde, transforme et s'engage sans demi-mesure. Va au fond des choses : c'est dans l'intensité que tu trouves ta vérité.",
  '♐':
    "Sagittaire, l'explorateur de feu. Il ouvre vers le sens, l'horizon et la foi. Ose l'inconnu et l'enseignement : ton optimisme ouvre des chemins.",
  '♑':
    "Capricorne, le bâtisseur de terre. Il vise le sommet par la rigueur et la patience. Avance par étapes sûres : ta persévérance finit par tout conquérir.",
  '♒':
    "Verseau, le visionnaire d'air. Il innove, relie et libère. Pense autrement et sers le collectif : ton originalité est une avancée pour tous.",
  '♓':
    "Poissons, le rêve d'eau. Il unit, compassionne et efface les séparations. Laisse parler l'empathie et l'imaginaire : tu sens ce que les mots ne disent pas.",
};

/** Significations du dé des Maisons (1 à 12). */
export const HOUSE_MEANINGS: Record<string, string> = {
  '1':
    "Maison I — Toi. Ton corps, ton caractère, la façon dont tu abordes le monde. C'est le terrain de ton identité en mouvement : commencer par t'aligner avec toi-même.",
  '2':
    "Maison II — Tes ressources. Argent, talents, ce qui a de la valeur pour toi. Le tirage touche à ta sécurité matérielle et à ce que tu sais offrir.",
  '3':
    "Maison III — Ton environnement proche. Fratrie, voisinage, apprentissages du quotidien. Les échanges courts et les premiers pas de connaissance sont en lumière.",
  '4':
    "Maison IV — Tes racines. Foyer, famille, fondations intérieures. Le tirage touche à ce qui te porte dans l'intime et au besoin de te sentir chez toi.",
  '5':
    "Maison V — Ta joie de vivre. Création, jeu, amours naissantes, enfants du cœur. C'est le terrain de l'expression libre et du plaisir d'exister.",
  '6':
    "Maison VI — Ton quotidien. Santé, travail, petits soins et routines. Le tirage pointe l'hygiène de vie et l'art d'ajuster ton train-train vers le mieux-être.",
  '7':
    "Maison VII — L'autre. Couples, associations, miroirs que tu renvoie la vie. C'est le terrain du « nous » : ce que la relation vient te révéler.",
  '8':
    "Maison VIII — Les profondeurs. Transformation, intimité, ressources partagées, ce qui se transmet. Le tirage touche au renouveau par ce qu'on ose laisser mourir.",
  '9':
    "Maison IX — L'horizon. Études, voyages, croyances, sens donné à l'existence. C'est le terrain de l'ouverture : élargir ton monde et tes certitudes.",
  '10':
    "Maison X — Ta place dans le monde. Vocation, reconnaissance, ce que tu bâtis pour durer. Le tirage touche à ta visibilité et à ta responsabilité sociale.",
  '11':
    "Maison XI — Tes alliances. Amitiés, projets collectifs, espoirs partagés. C'est le terrain du réseau qui te porte et des idées qui deviennent mouvement.",
  '12':
    "Maison XII — L'invisible. Rêves, retraits, zones d'ombre et compassion silencieuse. Le tirage touche à ce qui se guérit dans le secret et le lâcher-prise.",
};

export const DICE_MEANINGS: Record<DieKind, Record<string, string>> = {
  planet: PLANET_MEANINGS,
  sign: SIGN_MEANINGS,
  house: HOUSE_MEANINGS,
};

/** Renvoie le texte de signification pour un dé + valeur, ou '' si inconnu. */
export function meaningFor(
  kind: DieKind,
  value: string | number,
): string {
  return DICE_MEANINGS[kind]?.[String(value)] ?? '';
}
