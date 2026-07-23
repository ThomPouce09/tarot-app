// app/api/astro-dice-interpretation/route.ts
//
// Interprétation LLM des Dés du Zodiaque. Reçoit les faces tirées + le mode,
// un texte optionnel d'interprétation DB (astroInterpretation) qui sert
// de BASE à l'analyse, et une question utilisateur optionnelle pour
// personnaliser la réponse.
//
// La page /des-divinatoires/affinage affiche en parallèle une analyse
// STATIQUE (meanings.ts, 100% client) + la carte DB combinée, avant le LLM.

import { NextRequest, NextResponse } from 'next/server';
import { callOracle } from '@/lib/llm';
import { type DieKind } from '@/components/astro-dice/glyphs';

type Mode = 'global' | 'zoom-action' | 'zoom-domaine' | 'choix' | 'obstacle-solution';

const VALID_MODES: Mode[] = ['global', 'zoom-action', 'zoom-domaine', 'choix', 'obstacle-solution'];

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

function dbContextBlock(dbInterpretation?: string): string {
  if (!dbInterpretation) return '';
  return `\n\nINTERPRÉTATION ASTROLOGIQUE DE RÉFÉRENCE (texte curé pour cette combinaison exacte planète×signe×maison) :\n« ${dbInterpretation} »\n\nCe texte est ta BASE. Tu dois le citer, le paraphraser et l'étoffer — ne le contredis pas, approfondis-le.`;
}

function questionBlock(question?: string): string {
  if (!question || !question.trim()) return '';
  return `
LA QUESTION DE LA PERSONNE (objet central — CHAQUE mot de ta réponse DOIT s'y rapporter) :
« ${question.trim()} »

⚠️ CONSIGNE IMPÉRATIVE : tout ce que tu écris doit répondre à CETTE question précise.
Tu n'es PAS en train de décrire une configuration astrologique générale.
Tu es en train de RÉPONDRE à cette personne qui t'a posé UNE QUESTION.
Chaque phrase doit éclairer SA situation, PAS décrire la planète, le signe ou la maison en général.
Le tirage astrologique est le SUPPORT pour répondre — pas le sujet principal.`;
}

// ── Mode global (lecture à 3 dés) ──

function buildPrompt(
  faces: Record<string, string | number>,
  activeKinds: DieKind[],
  mode: Mode,
  dbInterpretation?: string,
  question?: string,
): string {
  const parts = activeKinds.map((k) => `• ${k} = ${faces[k]} (${nameOf(k, faces[k])})`);
  const tirage = parts.join('\n');
  const db = dbContextBlock(dbInterpretation);
  const q = questionBlock(question);

  if (mode === 'global') {
    const parts = activeKinds.map((k) => {
      const label = k === 'planet' ? 'Planète / Astre tiré(e)' : k === 'sign' ? 'Signe du zodiaque tiré' : 'Maison astrologique tirée';
      return `- ${label} : ${faces[k]} (${nameOf(k, faces[k])})`;
    });
    const tirage = parts.join('\n');
    const db = dbContextBlock(dbInterpretation);
    const hasQuestion = question && question.trim().length > 0;
    return `Agis en tant qu'astrologue expert et analyste intuitif. Ton approche combine rigueur symbolique et clarté pragmatique, sans jargon superflu.

Je vais te soumettre une question ainsi que le résultat d'un tirage de 3 dés astrologiques (Planète, Signe, Maison). Ton objectif est d'analyser les énergies sous-jacentes de ce tirage pour y répondre avec précision et profondeur.

### Données du tirage :
${hasQuestion ? `- Question posée : ${question}` : '- Aucune question spécifique — donne une lecture générale des énergies.'}
${tirage}${db}

### Structure de ta réponse :
1. **Décomposition des énergies** : Analyse brièvement chaque dé de manière interconnectée (comment la Planète s'exprime à travers le Signe et s'applique au domaine de la Maison).
2. **Réponse directe à la question** : Applique cette synthèse dynamique pour répondre clairement, sans ambiguïté, à la question posée.
3. **Perspective ou conseil pratique** : Offre un éclairage stratégique ou une piste d'action concrète découlant de ce tirage.

Sois percutant, direct et évite les banalités ou les généralités creuses.

RÉPONDS STRICTEMENT EN FORMAT JSON (pas de texte avant ni après, pas de markdown) :

{
  "sections": [
    {
      "key": "energies",
      "label": "Décomposition des énergies — Planète × Signe × Maison",
      "text": "4-6 phrases interconnectées : comment la planète s'exprime via le signe, dans le domaine de la maison."
    },
    {
      "key": "reponse",
      "label": "Réponse à la question",
      "text": "4-6 phrases qui répondent DIRECTEMENT à la question posée, sans détour."
    },
    {
      "key": "conseil",
      "label": "Perspective & conseil pratique",
      "text": "3-5 phrases : éclairage stratégique, piste d'action concrète, orientation actionable."
    }
  ],
  "synthese": "Une phrase finale puissante, percutante, qui résume l'essentiel à retenir."
}`;
  }

  if (mode === 'zoom-action') {
    return `Tirage de base des Dés du Zodiaque :
${tirage}${db}${q}
On a relancé le dé des Signes pour préciser l'action à mener. En te basant sur ce nouveau signe, le contexte astrologique et la question posée, indique quelle attitude ou action concrète adopter MAINTENANT pour débloquer la situation.
Ton de conseil pratique et oracle, à la 2e personne, en français. 150-250 mots. Sois très concret : donne des actions précises, pas des généralités. Réponds UNIQUEMENT en texte libre (pas de JSON).`;
  }

  return `Tirage de base des Dés du Zodiaque :
${tirage}${db}${q}
On a relancé le dé des Maisons pour préciser le domaine impacté par ricochet. Indique quel(s) autre(s) domaine(s) de la vie de la personne va/vent être impacté(s) par cette décision, en lien avec sa question et le contexte astrologique donné.
Ton prospectif, à la 2e personne, en français. 150-250 mots. Cite des domaines concrets, pas des généralités. Réponds UNIQUEMENT en texte libre (pas de JSON).`;
}

// ── Mode Choix (2 tirages) ──

function buildChoixPrompt(
  a: Record<string, string | number>,
  b: Record<string, string | number>,
  kinds: DieKind[],
  question?: string,
  dbA?: string,
  dbB?: string,
): string {
  const fmt = (label: string, faces: Record<string, string | number>) =>
    `${label} :\n` +
    kinds.map((k) => `• ${k} = ${faces[k]} (${nameOf(k, faces[k])})`).join('\n');
  const bloc = `${fmt('PREMIER CHOIX', a)}\n\n${fmt('SECOND CHOIX', b)}`;
  const dbBlockA = dbContextBlock(dbA);
  const dbBlockB = dbContextBlock(dbB);
  const q = questionBlock(question);

  return `Tu es un astrologue de la tradition occidentale d'une grande précision, ton poétique mais concret, en français.

RAPPEL DES 3 PILIERS :
• La PLANÈTE = le "Qui / Quoi" : l'énergie active, l'acteur.
• Le SIGNE = le "Comment" : la coloration, le tempérament.
• La MAISON (1 à 12) = le "Où" : le domaine concret de la vie concerné.

Deux tirages ont été faits, un pour chaque choix de la personne :
${bloc}${q}

PREMIER CHOIX — Contexte astrologique :${dbBlockA}
SECOND CHOIX — Contexte astrologique :${dbBlockB}

IMPORTANT : utilise IMPÉRATIVEMENT les valeurs réelles et les contextes astrologiques fournis. Si une question a été posée, réponds-y directement en comparant les deux chemins à la lumière de cette question.

Réponds STRICTEMENT en JSON (pas de texte avant ni après, pas de markdown) :
{
  "comparaison": "Comparaison des deux chemins TRÈS DÉTAILLÉE (8-12 phrases). Décris précisément ce que chaque option activerait comme énergies, leurs conséquences concrètes, et laquelle semble la plus alignée avec la question de la personne. Sois oracle : donne une recommandation claire sans être directif."
}
Réponds UNIQUEMENT avec l'objet JSON.`;
}

// ── Mode Obstacle + Solution ──

function buildObstacleSolutionPrompt(
  faces: Record<string, string | number>,
  kinds: DieKind[],
  kind: 'obstacle' | 'solution',
  dbInterpretation?: string,
  question?: string,
): string {
  const parts = kinds.map((k) => `• ${k} = ${faces[k]} (${nameOf(k, faces[k])})`);
  const tirage = parts.join('\n');
  const db = dbContextBlock(dbInterpretation);
  const q = questionBlock(question);

  if (kind === 'obstacle') {
    return `Tu es un astrologue, ton chaleureux et SIMPLE, en français courant (pas d'emphase pompeuse).

RAPPEL DES 3 PILIERS :
• La PLANÈTE = l'énergie en jeu.
• Le SIGNE = l'attitude qui coince.
• La MAISON (1 à 12) = le domaine de vie touché.

Tirage de l'OBSTACLE :
${tirage}${db}${q}

IMPORTANT : utilise IMPÉRATIVEMENT ces valeurs réelles et le contexte astrologique. Si une question a été posée, le blocage dont tu parles doit être en lien avec cette question précise.

Explique de façon simple et rassurante ce qui bloque. Développe 3-4 phrases par section. Sois concret sur les énergies et les comportements. Réponds STRICTEMENT en JSON (pas de texte avant/après, pas de markdown) :
{
  "sections": [
    { "key": "planet", "label": "L'énergie en jeu", "text": "3-4 phrases sur la planète, ce qu'elle représente ici, comment elle s'exprime." },
    { "key": "sign", "label": "L'attitude qui coince", "text": "3-4 phrases sur le signe et le comportement inadapté à comprendre." },
    { "key": "house", "label": "Le domaine touché", "text": "3-4 phrases sur la maison et où ça coince dans la vie." }
  ],
  "synthese": "3-4 phrases qui résument le blocage et le relient à la question."
}
Réponds UNIQUEMENT avec l'objet JSON.`;
  }

  return `Tu es un astrologue, ton PRATIQUE et SIMPLE, en français courant (clair, concret).

RAPPEL DES 3 PILIERS :
• La PLANÈTE = la force intérieure à réveiller.
• Le SIGNE = la posture juste à incarner.
• La MAISON = le levier d'action concret.

Tirage de la SOLUTION :
${tirage}${db}${q}

IMPORTANT : utilise ces valeurs et le contexte astrologique. Si une question a été posée, la solution doit répondre à cette question précise.

Aide la personne à comprendre concrètement la solution. Développe. Réponds STRICTEMENT en JSON :
{
  "sections": [
    { "key": "planet", "label": "La force à réveiller", "text": "3-4 phrases sur la planète et la ressource intérieure à activer." },
    { "key": "sign", "label": "La posture juste", "text": "3-4 phrases sur le signe et le comportement idéal." },
    { "key": "house", "label": "Le levier d'action", "text": "3-4 phrases sur la maison et où agir concrètement." }
  ],
  "synthese": "3-4 phrases qui résument la direction.",
  "actions": [
    "Action concrète 1 : un petit pas simple et réalisable cette semaine.",
    "Action concrète 2 : un deuxième pas clair.",
    "Action concrète 3 : un troisième pas qui ancre la nouvelle habitude."
  ]
}
Les actions en langage courant, CHACUNE commence par "Action concrète N :", 10-20 mots, vraiment faisables. Réponds UNIQUEMENT avec l'objet JSON.`;
}

export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { faces, activeKinds, mode, facesA, facesB, dbInterpretation, question } = body;
  const m = (mode as Mode) || 'global';
  const kinds = Array.isArray(activeKinds)
    ? (activeKinds.filter((k: string) => k === 'planet' || k === 'sign' || k === 'house') as DieKind[])
    : (['planet', 'sign', 'house'] as DieKind[]);
  if (!VALID_MODES.includes(m)) {
    return NextResponse.json({ error: `mode invalide : ${mode}` }, { status: 400 });
  }

  // ── Mode comparaison de choix ──
  if (m === 'choix') {
    if (!facesA || !facesB || typeof facesA !== 'object' || typeof facesB !== 'object') {
      return NextResponse.json({ error: 'facesA et facesB requis' }, { status: 400 });
    }
    const prompt = buildChoixPrompt(facesA, facesB, kinds, question, body.dbInterpretationA, body.dbInterpretationB);
    const content = (await callOracle(prompt)) || '';
    if (!content || content.trim().length === 0) {
      return NextResponse.json({
        comparaison: "Les étoiles se voilent un instant… La comparaison n'a pas pu être générée. Recommence plus tard.",
      }, { status: 200 });
    }
    try {
      const json = extractJson(content);
      if (json && json.comparaison) {
        return NextResponse.json({ comparaison: json.comparaison.trim() });
      }
    } catch { /* fallback */ }
    return NextResponse.json({ comparaison: content.trim() });
  }

  // ── Mode Obstacle & Solution ──
  if (m === 'obstacle-solution') {
    const kind = body.kind === 'solution' ? 'solution' : 'obstacle';
    if (!faces || typeof faces !== 'object') {
      return NextResponse.json({ error: 'faces requis' }, { status: 400 });
    }
    const prompt = buildObstacleSolutionPrompt(faces, kinds, kind, dbInterpretation, question);
    const content = (await callOracle(prompt)) || '';
    if (!content || content.trim().length === 0) {
      return NextResponse.json({
        texte: "Les étoiles se voilent un instant… L'analyse n'a pas pu être générée. Recommence plus tard.",
      }, { status: 200 });
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
          sections, synthese: json.synthese || '', actions, texte: content.trim(),
        });
      }
    } catch { /* fallback */ }
    return NextResponse.json({ texte: content.trim() });
  }

  // ── Mode global / zoom ──
  if (!faces || typeof faces !== 'object') {
    return NextResponse.json({ error: 'faces requis' }, { status: 400 });
  }
  if (kinds.length === 0) {
    return NextResponse.json({ error: 'activeKinds vide' }, { status: 400 });
  }

  const prompt = buildPrompt(faces, kinds, m, dbInterpretation, question);
  const content = (await callOracle(prompt)) || '';

  if (!content || content.trim().length === 0) {
    return NextResponse.json({
      texte: "Les étoiles se voilent un instant… L'analyse approfondie n'a pas pu être générée. Recommence plus tard.",
    }, { status: 200 });
  }

  if (m === 'global') {
    try {
      const json = extractJson(content);
      // Nouveau format { sections: [{key, label, text}], synthese }
      if (json && Array.isArray(json.sections) && json.sections.length > 0) {
        const sections = json.sections
          .filter((s: any) => s && s.text && String(s.text).trim().length > 0)
          .map((s: any) => ({ key: s.key, label: s.label || s.key, text: s.text }));
        return NextResponse.json({
          sections, synthese: json.synthese || '', texte: content.trim(),
        });
      }
      // Ancien format { planet, sign, house, synthese } (backwards compat)
      if (json && (json.planet || json.sign || json.house || json.synthese)) {
        const sections = [
          { key: 'planet', label: 'La Planète — le Qui / Quoi', text: json.planet || '' },
          { key: 'sign', label: 'Le Signe — le Comment', text: json.sign || '' },
          { key: 'house', label: 'La Maison — le Où', text: json.house || '' },
        ].filter((s) => s.text.trim().length > 0);
        return NextResponse.json({
          sections, synthese: json.synthese || '', texte: content.trim(),
        });
      }
    } catch { /* fallback */ }
  }

  return NextResponse.json({ texte: content.trim() });
}

function extractJson(raw: string): any {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return JSON.parse(raw.slice(start, end + 1));
}
