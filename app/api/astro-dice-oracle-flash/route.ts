// app/api/astro-dice-oracle-flash/route.ts
// Réponse oracle flash (1-2 phrases) déclenchée automatiquement dès le
// lancer des dés. Gère aussi le tirage affiné (option A ou B).
//
// Ce endpoint est volontairement léger — prompt minimal, modèle rapide,
// réponse courte — pour un affichage quasi instantané.

import { NextRequest, NextResponse } from 'next/server';
import { callOracle } from '@/lib/llm';

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

function nameOf(kind: string, value: string | number): string {
  if (kind === 'planet') return PLANET_NAMES[String(value)] ?? String(value);
  if (kind === 'sign') return SIGN_NAMES[String(value)] ?? String(value);
  return `Maison ${value}`;
}

/** Formate les faces en chaîne lisible. */
function formatTirage(faces: Record<string, string | number>, kinds: string[]): string {
  const parts = kinds.map((k: string) => {
    const v = faces[k];
    if (k === 'planet') return nameOf(k, v);
    if (k === 'sign') return nameOf(k, v);
    return `Maison ${v}`;
  });
  return parts.length >= 3
    ? `${parts[0]} en ${parts[1]}, ${parts[2]}`
    : parts.join(', ');
}

export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { faces, activeKinds, question, option, originalFaces } = body;
  if (!faces || typeof faces !== 'object') {
    return NextResponse.json({ error: 'faces requis' }, { status: 400 });
  }

  const kinds = Array.isArray(activeKinds)
    ? activeKinds.filter((k: string) => k === 'planet' || k === 'sign' || k === 'house')
    : ['planet', 'sign', 'house'];

  const q = (question && question.trim())
    ? `\n\nQuestion : ${question.trim()}`
    : '';

  let prompt: string;

  if (option === 'action' || option === 'domaine') {
    // ── Tirage affiné (option A ou B) ──
    const oldTirage = originalFaces ? formatTirage(originalFaces, kinds) : '';
    const newTirage = formatTirage(faces, kinds);
    const changedLabel = option === 'action' ? 'le Signe' : 'la Maison';

    prompt = `Tirage initial : ${oldTirage}.
Tirage affiné : ${newTirage}.${q}

Un seul dé a été relancé. Le fond du problème ne change pas, c'est la sensibilité du microscope qui s'ajuste.
${option === 'action'
  ? "- Si le Signe a changé : analyse le nouvel Élément/Mode et son degré de friction ou d'harmonie avec la Planète pour ajuster le 'volume' de l'attitude (plus sec, plus doux, analytique, etc.)."
  : "- Si la Maison a changé : utilise la triade (Angulaire/Succédante/Cadente) et sa nature (intérieure/matérielle) pour définir la 'profondeur' du ricochet (impact concret immédiat, ajustement subtil, prise de conscience, etc.)."}

En 1 à 2 phrases maximum, traduis cette nouvelle nuance et explique comment elle vient colorer ou réorienter la réponse à la question.

Réponds UNIQUEMENT avec du texte libre, pas de JSON, pas de markdown, pas de formatage.`;
  } else {
    // ── Tirage initial ──
    const tirageStr = formatTirage(faces, kinds);

    prompt = `Agis comme un oracle intuitif. Voici mon tirage de dés astrologiques : ${tirageStr}.${q}

En te laissant guider par le mystère de ces énergies, donne-moi une réponse suggestive et ouverte (en même temps orientée et évasive) en 1 à 2 phrases maximum.

Réponds UNIQUEMENT avec du texte libre, pas de JSON, pas de markdown, pas de formatage.`;
  }

  const content = (await callOracle(prompt)) || '';

  // Nettoyage agressif : le LLM renvoie parfois du texte entouré de
  // {"ANSWER": "..."}, {"oracle": "..."}, "réponse", ou { "..." }.
  let cleaned = content.trim();

  // Essai 1 : parsing JSON complet
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed === 'string') {
      cleaned = parsed.trim();
    } else if (typeof parsed === 'object' && parsed !== null) {
      // Prendre la 1ère valeur string trouvée (la plus longue)
      const vals = Object.values(parsed).filter((v): v is string => typeof v === 'string');
      vals.sort((a, b) => b.length - a.length);
      if (vals.length > 0) cleaned = vals[0].trim();
    }
  } catch {
    // Essai 2 : commence/finit par des guillemets (JSON string sans objet)
    if (/^["'].*["']$/.test(cleaned) && cleaned.length > 2) {
      cleaned = cleaned.slice(1, -1).trim();
    }
  }

  if (!cleaned || cleaned.length === 0) {
    return NextResponse.json({
      oracle: "Les énergies se rassemblent… un message se dessine.",
    }, { status: 200 });
  }

  return NextResponse.json({ oracle: cleaned });
}
