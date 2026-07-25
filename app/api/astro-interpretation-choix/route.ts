// app/api/astro-interpretation-choix/route.ts
// Interprétation courte LLM (1-2 phrases) pour un tirage "Choix".
// Le prompt est chargé depuis la base Neon (table PromptTemplate, clé 'choix-short').

import { NextRequest, NextResponse } from 'next/server';
import { callOracle } from '@/lib/llm';
import { getPrompt } from '@/lib/prompts';

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

  // Charger le prompt depuis la base
  let prompt: string;
  try {
    prompt = await getPrompt('choix-short', {
      optionLabel,
      optionNum,
      planet,
      sign,
      house,
      question: question || 'Aucune question saisie',
    });
  } catch (err) {
    console.error('[astro-interpretation-choix] Erreur chargement prompt:', err);
    return NextResponse.json(
      { interpretation: null, found: false },
      { status: 200 },
    );
  }

  try {
    const response = await callOracle(prompt, { maxTokens: 500, temperature: 0.3 });
    if (!response) {
      return NextResponse.json(
        { interpretation: null, found: false },
        { status: 200 },
      );
    }

    let text = response.trim();

    // Nettoyer les backticks markdown AVANT le parse
    text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();

    // Le modèle peut retourner du JSON — on tente d'extraire le champ texte
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object') {
        // Accepter tous les champs possibles selon le format retourné par le LLM
        text = parsed.interpretation || parsed.texte || parsed.analysis || text;
      }
    } catch {
      // Pas du JSON valide — essayer la regex pour extraire les champs
      const m = text.match(/"(?:interpretation|texte|analysis)"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (m) text = m[1]
        .replace(/\\n/g, '\n')
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"');
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
