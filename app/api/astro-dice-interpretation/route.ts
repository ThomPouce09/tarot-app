// app/api/astro-dice-interpretation/route.ts
//
// Interprétation LLM des Dés du Zodiaque. Reçoit les faces tirées + le mode
// (lecture globale ou zoom d'affinage) et renvoie un texte d'analyse généré
// via la cascade callOracle (OpenRouter / NVIDIA / DeepSeek — clés serveur).
//
// La page /des-divinatoires/affinage affiche en parallèle une analyse
// STATIQUE (meanings.ts, 100% client) qui « fait patienter » pendant ce appel.

import { NextRequest, NextResponse } from 'next/server';
import { callOracle } from '@/lib/llm';
import { PLANETS, SIGNS, HOUSES, type DieKind } from '@/components/astro-dice/glyphs';

type Mode = 'global' | 'zoom-action' | 'zoom-domaine';

const VALID_MODES: Mode[] = ['global', 'zoom-action', 'zoom-domaine'];

// Noms lisibles des glyphes pour le prompt.
const PLANET_NAMES: Record<string, string> = {
  '☉': 'le Soleil', '☽': 'la Lune', '☿': 'Mercure', '♀': 'Vénus',
  '♂': 'Mars', '♃': 'Jupiter', '♄': 'Saturne', '♅': 'Uranus',
  '♆': 'Neptune', '♇': 'Pluton', '☊': 'le Nœud Nord', '☋': 'le Nœud Sud',
};
const SIGN_NAMES: Record<string, string> = {
  '♈': 'Bélier', '♉': 'Taureau', '♊': 'Gémeaux', '♋': 'Cancer',
  '♌': 'Lion', '♍': 'Vierge', '♎': 'Balance', '♏': 'Scorpion',
  '♐': 'Sagittaire', '♑': 'Capricorne', '♒': 'Verseau', '♓': 'Poissons',
};

function nameOf(kind: DieKind, value: string | number): string {
  if (kind === 'planet') return PLANET_NAMES[String(value)] ?? String(value);
  if (kind === 'sign') return SIGN_NAMES[String(value)] ?? String(value);
  return `Maison ${value}`;
}

function buildPrompt(faces: Record<string, string | number>, activeKinds: DieKind[], mode: Mode): string {
  const parts = activeKinds.map((k) => `• ${k} = ${faces[k]} (${nameOf(k, faces[k])})`);
  const tirage = parts.join('\n');

  if (mode === 'global') {
    return `Tu es un astrologue de la tradition occidentale, ton de voix poétique mais précis, en français.

RAPPEL DES 3 PILIERS DES DÉS DU ZODIAQUE (indispensables pour une analyse fine) :
• La PLANÈTE (☉ ☽ ☿ ♀ ♂ ♃ ♄ ♅ ♆ ♇) = le "Qui / Quoi" : l'énergie active, l'ACTEUR principal de la réponse.
• Le SIGNE (♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓) = le "Comment" : la coloration, le tempérament de cette énergie.
• La MAISON (1 à 12) = le "Où" : le domaine concret de la vie quotidienne où cela se joue.

Voici le tirage :
${tirage}

IMPORTANT : utilise IMPÉRATIVEMENT les valeurs ci-dessus (planète, signe, maison réellement tirés). Ne fais jamais semblant qu'elles manquent ou restent voilées — elles sont données, construis ton analyse DESSUS.

Donne une analyse en 3 parties qui respectent strictement les rôles ci-dessus :
1) PLANÈTE — l'énergie / l'acteur (le "Qui/Quoi") ;
2) SIGNE — la coloration et le tempérament de cette énergie (le "Comment") ;
3) MAISON — le domaine de vie concret concerné (le "Où").
Puis une synthèse d'un paragraphe sur la leçon ou l'orientation que ce tirage offre à la personne.
Écris de manière chaleureuse, comme un oracle bienveillant qui s'adresse à un être cher. 140-200 mots. Réponds UNIQUEMENT en texte libre (pas de JSON).`;
  }

  if (mode === 'zoom-action') {
    return `Tirage de base des Dés du Zodiaque :
${tirage}
On a relancé le dé des Signes pour préciser l'action. En te basant sur ce nouveau signe, dis quelle est la meilleure attitude ou posture à adopter maintenant pour débloquer la situation.
Ton de conseil pratique et bienveillant, en français, à la 2e personne. 90-140 mots. Réponds UNIQUEMENT en texte libre (pas de JSON).`;
  }

  // zoom-domaine
  return `Tirage de base des Dés du Zodiaque :
${tirage}
On a relancé le dé des Maisons pour préciser le domaine. Indique quel autre domaine de la vie de la personne va être impacté par ricochet par cette décision.
Ton prospectif, en français, à la 2e personne. 90-140 mots. Réponds UNIQUEMENT en texte libre (pas de JSON).`;
}

export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { faces, activeKinds, mode } = body;
  const m = (mode as Mode) || 'global';
  if (!VALID_MODES.includes(m)) {
    return NextResponse.json({ error: `mode invalide : ${mode}` }, { status: 400 });
  }
  if (!faces || typeof faces !== 'object') {
    return NextResponse.json({ error: 'faces requis' }, { status: 400 });
  }
  const kinds = Array.isArray(activeKinds)
    ? (activeKinds.filter((k: string) => k === 'planet' || k === 'sign' || k === 'house') as DieKind[])
    : (['planet', 'sign', 'house'] as DieKind[]);
  if (kinds.length === 0) {
    return NextResponse.json({ error: 'activeKinds vide' }, { status: 400 });
  }

  const prompt = buildPrompt(faces, kinds, m);
  const content = (await callOracle(prompt)) || '';

  if (!content || content.trim().length === 0) {
    return NextResponse.json(
      { texte: "Les étoiles se voilent un instant… L'analyse approfondie n'a pas pu être générée. Recommence plus tard." },
      { status: 200 },
    );
  }

  return NextResponse.json({ texte: content.trim() });
}
