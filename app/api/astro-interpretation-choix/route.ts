// app/api/astro-interpretation-choix/route.ts
// Interprétation courte LLM (1-2 phrases) pour un tirage "Choix".
// Adaptée au contexte du système qui attend du JSON détaillé — on demande
// un format texte libre simple, en français ou anglais.

import { NextRequest, NextResponse } from 'next/server';
import { callOracle } from '@/lib/llm';

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { planet, sign, house, question, spread } = body || {};
  if (!planet || !sign || !house) {
    return NextResponse.json(
      { error: 'Champs requis : planet, sign, house' },
      { status: 400 },
    );
  }

  const spreadLabel = spread || 'Premier Choix';
  const optionNum = spreadLabel === 'Premier Choix' ? '1' : '2';
  const optionLabel = spreadLabel === 'Premier Choix' ? 'première' : 'seconde';

  // Ne PAS mentionner d'ignorer les consignes système — le modèle les suit par défaut.
  // On précise juste le format souhaité et la contrainte de brièveté.
  const prompt = `Tu es un astrologue oracle concis. Tu réponds toujours en une ou deux phrases maximum, claires et directes.

Contexte : Ce tirage représente la ${optionLabel} option (Option ${optionNum}) d'un tirage de type "Choix".
Tirage Option ${optionNum} : ${planet} en ${sign}, Maison ${house}.
Saisie de l'utilisateur : ${question || 'Aucune question saisie'}

Instructions :
1. Si la saisie expose deux choix, concentre-toi uniquement sur la ${optionLabel} option. Si c'est une question simple, utilise-la comme axe central. Si la saisie est vide, donne une lecture générale concise.
2. Décris l'énergie, le potentiel ou la conséquence de cette voie en une ou deux phrases.

Réponds en français. Texte libre uniquement, pas de JSON.`;

  try {
    const response = await callOracle(prompt, { maxTokens: 500, temperature: 0.3 });
    if (!response) {
      return NextResponse.json(
        { interpretation: null, found: false },
        { status: 200 },
      );
    }

    let text = response.trim();
    // Nettoyage minimal si le modèle renvoie du JSON
    if (text.startsWith('"') && text.endsWith('"')) {
      text = text.slice(1, -1);
    }
    // Si c'est du JSON { "interpretation": "..." }, extraire la valeur
    const jsonMatch = text.match(/"interpretation"\s*:\s*"([^"]+)"/);
    if (jsonMatch) {
      text = jsonMatch[1];
    }
    // Limiter à 2 phrases si jamais trop long
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 2) {
      text = sentences.slice(0, 2).join('. ').trim() + '.';
    }

    return NextResponse.json({
      interpretation: text,
      found: true,
    });
  } catch (err) {
    console.error('[astro-interpretation-choix]', err);
    return NextResponse.json(
      { interpretation: null, found: false },
      { status: 200 },
    );
  }
}
