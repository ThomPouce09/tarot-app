// app/api/astro-interpretation-approfondie/route.ts
// Analyse approfondie (5+ phrases) pour un tirage "Choix".
// Prompt astrologue expert, structuré, sans antagonisme avec le système.

import { NextRequest, NextResponse } from 'next/server';
import { callOracle } from '@/lib/llm';

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { planet, sign, house, question, spread, lang = 'fr' } = body || {};
  if (!planet || !sign || !house) {
    return NextResponse.json(
      { error: 'Champs requis : planet, sign, house' },
      { status: 400 },
    );
  }

  const langue = lang === 'en' ? 'en' : 'fr';
  const spreadLabel = spread || 'Premier Choix';
  const optionNum = spreadLabel === 'Premier Choix' ? '1' : '2';
  const optionLabel = spreadLabel === 'Premier Choix' ? 'première' : 'seconde';
  const saisie = question && question.trim()
    ? question
    : 'Aucune saisie utilisateur — dresser un panorama générique.';

  const prompt = `Tu es un astrologue expert et analyste stratège. Tu donnes des lectures détaillées et fines, en expliquant la mécanique des énergies en jeu.

Contexte : Ce tirage correspond à la ${optionLabel} voie (Option ${optionNum}) d'une situation (Tirage "Choix" ou question simple).
Saisie de l'utilisateur : ${saisie}
Tirage : ${planet} en ${sign}, Maison ${house}.

Analyse à produire :

1. Cadrage du sujet :
- Si la saisie expose deux options, concentre-toi EXCLUSIVEMENT sur la ${optionLabel} option (Option ${optionNum}). Ignore le second.
- Si la saisie est une question simple, utilise-la comme axe central.
- Si la saisie est VIDE, dresse un panorama générique des influences du tirage : thèmes centraux, dynamiques, défis et opportunités.

2. Décryptage par dé :
Explique l'influence de chaque dé appliqué au sujet :
- La Planète (${planet}) : Le Moteur — énergie d'action brute, force archétypale.
- Le Signe (${sign}) : La Méthode — filtre élément/mode, attitude, couleur psychologique.
- La Maison (${house}) : Le Terrain — domaine d'expérience, sphère matérielle ou intérieure.

3. Synthèse stratégique :
Assemble les trois engrenages pour une conclusion cohérente. S'il y a une saisie, conclus sur la viabilité de cette ${optionLabel} voie. Si la saisie est vide, donne un conseil général.

Contrainte : Ta réponse doit faire au moins 5 phrases. Utilise des paragraphes courts. Ton clair, pragmatique et structuré.
Réponds en ${langue === 'fr' ? 'français' : 'anglais'}.

Retourne UNIQUEMENT un objet JSON valide comme ceci : {"texte": "ta réponse ici"} — sans aucun texte avant ou après.`;

  try {
    const response = await callOracle(prompt, { maxTokens: 1200, temperature: 0.5 });
    if (!response) {
      return NextResponse.json({ analysis: null }, { status: 200 });
    }

    let text = response.trim();
    // Le modèle retourne du JSON — on parse ou on extrait
    try {
      const parsed = JSON.parse(text);
      text = parsed.texte || parsed.analysis || text;
    } catch {
      // Pas du JSON valide — extraire le champ analysis s'il est dans une structure
      const m = text.match(/"texte"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (m) text = m[1].replace(/\\n/g, '\n');
    }
    text = text.replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '').trim();

    return NextResponse.json({ analysis: text });
  } catch (err) {
    console.error('[astro-interpretation-approfondie]', err);
    return NextResponse.json({ analysis: null }, { status: 200 });
  }
}
