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

type Mode = 'global' | 'zoom-action' | 'zoom-domaine' | 'choix' | 'obstacle-solution';

const VALID_MODES: Mode[] = ['global', 'zoom-action', 'zoom-domaine', 'choix', 'obstacle-solution'];

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

Réponds STRICTEMENT en JSON (pas de texte avant ni après, pas de markdown) selon ce schéma :
{
  "planet": "Analyse de la planète (le Qui/Quoi) : 2 à 3 phrases chaleureuses, comme un oracle bienveillant.",
  "sign": "Analyse du signe (le Comment) : 2 à 3 phrases sur la coloration et le tempérament.",
  "house": "Analyse de la maison (le Où) : 2 à 3 phrases sur le domaine de vie concerné.",
  "synthese": "Synthèse d'un paragraphe (3-4 phrases) sur la leçon ou l'orientation que ce tirage offre."
}
Chaque champ fait 30 à 60 mots. Réponds UNIQUEMENT avec l'objet JSON.`;
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

function buildChoixPrompt(
  a: Record<string, string | number>,
  b: Record<string, string | number>,
  kinds: DieKind[],
): string {
  const fmt = (label: string, faces: Record<string, string | number>) =>
    `${label} :\n` +
    kinds.map((k) => `• ${k} = ${faces[k]} (${nameOf(k, faces[k])})`).join('\n');
  const bloc = `${fmt('PREMIER CHOIX', a)}\n\n${fmt('SECOND CHOIX', b)}`;

  return `Tu es un astrologue de la tradition occidentale, ton de voix poétique mais précis, en français.

RAPPEL DES 3 PILIERS DES DÉS DU ZODIAQUE :
• La PLANÈTE (☉ ☽ ☿ ♀ ♂ ♃ ♄ ♅ ♆ ♇) = le "Qui / Quoi" : l'énergie active, l'acteur.
• Le SIGNE (♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓) = le "Comment" : la coloration, le tempérament.
• La MAISON (1 à 12) = le "Où" : le domaine concret de la vie concerné.

Deux tirages ont été faits, un pour chaque choix de la personne :
${bloc}

IMPORTANT : utilise IMPÉRATIVEMENT les valeurs ci-dessus (les deux tirages sont réels). Ne fais jamais semblant qu'elles manquent.

Réponds STRICTEMENT en JSON (pas de texte avant ni après, pas de markdown) selon ce schéma :
{
  "comparaison": "Comparaison des deux chemins, en répondant EXACTEMENT à ces questions : l'option du Premier Choix apporte-t-elle de la stabilité ou de la stagnation ? L'option du Second Choix génère-t-elle du renouveau ou de l'instabilité ? 4 à 6 phrases chaleureuses, comme un oracle bienveillant qui aide la personne à sentir la fluidité des énergies de chaque chemin."
}
Réponds UNIQUEMENT avec l'objet JSON.`;
}

function buildObstacleSolutionPrompt(
  faces: Record<string, string | number>,
  kinds: DieKind[],
  kind: 'obstacle' | 'solution',
): string {
  const parts = kinds.map((k) => `• ${k} = ${faces[k]} (${nameOf(k, faces[k])})`);
  const tirage = parts.join('\n');

  if (kind === 'obstacle') {
    return `Tu es un astrologue de la tradition occidentale, ton chaleureux et TRÈS SIMPLE, en français courant (langage clair, pas d'effet oracle pompeux).

RAPPEL DES 3 PILIERS :
• La PLANÈTE = le "Qui / Quoi" : l'énergie en jeu.
• Le SIGNE = le "Comment" : l'attitude ou le tempérament.
• La MAISON (1 à 12) = le "Où" : le domaine de vie touché.

Tirage de l'OBSTACLE :
${tirage}

IMPORTANT : utilise IMPÉRATIVEMENT ces valeurs réelles.

Explique de façon SIMPLE et rassurante ce qui bloque la personne. Réponds STRICTEMENT en JSON (pas de texte avant/après, pas de markdown) :
{
  "sections": [
    { "key": "planet", "label": "L'énergie en jeu", "text": "1 phrase simple sur la planète tirée et ce qu'elle représente ici." },
    { "key": "sign", "label": "L'attitude qui coince", "text": "1 phrase simple sur le signe et l'attitude inadaptée à comprendre." },
    { "key": "house", "label": "Le domaine touché", "text": "1 phrase simple sur la maison et où ça se passe dans la vie." }
  ],
  "synthese": "1 phrase qui résume le blocage de façon limpide et bienveillante."
}
Réponds UNIQUEMENT avec l'objet JSON.`;
  }

  // kind === 'solution'
  return `Tu es un astrologue de la tradition occidentale, ton PRATIQUE et TRÈS SIMPLE, en français courant (langage clair, concret, pas d'effet oracle pompeux).

RAPPEL DES 3 PILIERS :
• La PLANÈTE = la force intérieure à réveiller.
• Le SIGNE = la posture juste à incarner.
• La MAISON = le levier d'action concret.

Tirage de la SOLUTION :
${tirage}

IMPORTANT : utilise IMPÉRATIVEMENT ces valeurs réelles.

Aide la personne à COMPRENDRE et INTÉGRER concrètement la solution. Réponds STRICTEMENT en JSON (pas de texte avant/après, pas de markdown) :
{
  "sections": [
    { "key": "planet", "label": "La force à réveiller", "text": "1 phrase simple sur la planète et la ressource intérieure à activer." },
    { "key": "sign", "label": "La posture juste", "text": "1 phrase simple sur le signe et le comportement idéal à adopter." },
    { "key": "house", "label": "Le levier d'action", "text": "1 phrase simple sur la maison et où agir concrètement." }
  ],
  "synthese": "1 phrase qui résume la direction à prendre, simplement.",
  "actions": [
    "Action concrète 1 : un petit pas clair et réalisable dès cette semaine.",
    "Action concrète 2 : un deuxième pas simple et précis.",
    "Action concrète 3 : un troisième pas qui ancre la nouvelle habitude."
  ]
}
Les actions sont en langage courant, CHACUNE commence par "Action concrète N :", courtes (10-20 mots), vraiment faisables. Réponds UNIQUEMENT avec l'objet JSON.`;
}

export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { faces, activeKinds, mode, facesA, facesB } = body;
  const m = (mode as Mode) || 'global';
  const kinds = Array.isArray(activeKinds)
    ? (activeKinds.filter((k: string) => k === 'planet' || k === 'sign' || k === 'house') as DieKind[])
    : (['planet', 'sign', 'house'] as DieKind[]);
  if (!VALID_MODES.includes(m)) {
    return NextResponse.json({ error: `mode invalide : ${mode}` }, { status: 400 });
  }

  // Mode comparaison de choix : on attend facesA + facesB.
  if (m === 'choix') {
    if (!facesA || !facesB || typeof facesA !== 'object' || typeof facesB !== 'object') {
      return NextResponse.json({ error: 'facesA et facesB requis' }, { status: 400 });
    }
    const prompt = buildChoixPrompt(facesA, facesB, kinds);
    const content = (await callOracle(prompt)) || '';
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { comparaison: "Les étoiles se voilent un instant… La comparaison n'a pas pu être générée. Recommence plus tard." },
        { status: 200 },
      );
    }
    try {
      const json = extractJson(content);
      if (json && json.comparaison) {
        return NextResponse.json({ comparaison: json.comparaison.trim() });
      }
    } catch {
      // ignore → fallback ci-dessous
    }
    return NextResponse.json({ comparaison: content.trim() });
  }

  // Mode Obstacle & Solution : on attend 'kind' (= 'obstacle' | 'solution').
  if (m === 'obstacle-solution') {
    const kind = body.kind === 'solution' ? 'solution' : 'obstacle';
    if (!faces || typeof faces !== 'object') {
      return NextResponse.json({ error: 'faces requis' }, { status: 400 });
    }
    const prompt = buildObstacleSolutionPrompt(faces, kinds, kind);
    const content = (await callOracle(prompt)) || '';
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { texte: "Les étoiles se voilent un instant… L'analyse n'a pas pu être générée. Recommence plus tard." },
        { status: 200 },
      );
    }
    try {
      const json = extractJson(content);
      if (json && Array.isArray(json.sections)) {
        const sections = (json.sections as any[])
          .filter((s) => s && s.text && String(s.text).trim().length > 0)
          .map((s) => ({ key: s.key, label: s.label, text: s.text }));
        const actions = Array.isArray(json.actions)
          ? json.actions.map((a: string) => String(a)).filter((a: string) => a.trim().length > 0)
          : [];
        return NextResponse.json({
          sections,
          synthese: json.synthese || '',
          actions,
          texte: content.trim(),
        });
      }
    } catch {
      // ignore → fallback ci-dessous
    }
    return NextResponse.json({ texte: content.trim() });
  }

  if (!faces || typeof faces !== 'object') {
    return NextResponse.json({ error: 'faces requis' }, { status: 400 });
  }
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

  // Pour le mode global, le LLM renvoie du JSON structuré → on le parse et
  // on le renvoie sous forme de sections (planet / sign / house / synthese).
  // Fallback : si le parsing échoue, on renvoie le texte brut dans `texte`.
  if (m === 'global') {
    try {
      const json = extractJson(content);
      if (json && (json.planet || json.sign || json.house || json.synthese)) {
        const sections = [
          { key: 'planet', label: 'La Planète — le Qui / Quoi', text: json.planet || '' },
          { key: 'sign', label: 'Le Signe — le Comment', text: json.sign || '' },
          { key: 'house', label: 'La Maison — le Où', text: json.house || '' },
        ].filter((s) => s.text.trim().length > 0);
        return NextResponse.json({
          sections,
          synthese: json.synthese || '',
          texte: content.trim(),
        });
      }
    } catch {
      // ignore → fallback ci-dessous
    }
  }

  return NextResponse.json({ texte: content.trim() });
}

/** Extrait le 1er objet JSON valide d'une chaîne (parfois entourée de texte). */
function extractJson(raw: string): any {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = raw.slice(start, end + 1);
  return JSON.parse(slice);
}
