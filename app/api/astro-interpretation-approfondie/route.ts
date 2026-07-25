// app/api/astro-interpretation-approfondie/route.ts
// Analyse approfondie LLM pour un tirage "Choix".
// Le prompt est chargé depuis la base Neon (table PromptTemplate, clé 'choix-deep').

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

  const { planet, sign, house, question, spread, lang = 'fr' } = body || {};
  if (!planet || !sign || !house) {
    return NextResponse.json(
      { error: 'Champs requis : planet, sign, house' },
      { status: 400 },
    );
  }

  const spreadLabel = spread || 'Premier Choix';
  const optionNum = spreadLabel === 'Premier Choix' ? '1' : '2';
  const optionLabel = spreadLabel === 'Premier Choix' ? 'première' : 'seconde';
  const saisie = question && question.trim()
    ? question
    : 'Aucune saisie utilisateur — dresser un panorama générique.';

  // Charger le prompt depuis la base
  let prompt: string;
  try {
    prompt = await getPrompt('choix-deep', {
      optionLabel,
      optionNum,
      planet,
      sign,
      house,
      question: saisie,
    });
  } catch (err) {
    console.error('[astro-interpretation-approfondie] Erreur chargement prompt:', err);
    return NextResponse.json({ analysis: null }, { status: 200 });
  }

  try {
    const response = await callOracle(prompt, { maxTokens: 1200, temperature: 0.5 });
    if (!response) {
      return NextResponse.json({ analysis: null }, { status: 200 });
    }

    let text = response.trim();

    // Nettoyer les éventuels backticks markdown AVANT le parse JSON
    text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();

    // Le modèle retourne du JSON — on parse ou on extrait
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object') {
        text = parsed.texte || parsed.analysis || parsed.interpretation || text;
      }
    } catch {
      // Pas du JSON valide — extraire tous les champs possibles
      const m = text.match(/"(?:texte|analysis|interpretation)"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (m) text = m[1]
        .replace(/\\n/g, '\n')
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"');
    }

    return NextResponse.json({ analysis: text });
  } catch (err) {
    console.error('[astro-interpretation-approfondie]', err);
    return NextResponse.json({ analysis: null }, { status: 200 });
  }
}
