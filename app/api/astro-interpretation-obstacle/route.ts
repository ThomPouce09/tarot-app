// app/api/astro-interpretation-obstacle/route.ts
// Interprétations LLM pour Obstacle & Solution.
// Prompt chargé depuis la base Neon (clés 'obstacle-short' ou 'obstacle-deep').

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

  const { planet, sign, house, question, kind, mode = 'short' } = body || {};
  if (!planet || !sign || !house || !kind) {
    return NextResponse.json(
      { error: 'Champs requis : planet, sign, house, kind' },
      { status: 400 },
    );
  }

  const kindLabel = kind === 'Obstacle' ? 'Obstacle' : 'Solution';
  const kindFr =
    kind === 'Obstacle' ? "l'Obstacle" : "la Solution";

  const promptKey = mode === 'deep' ? 'obstacle-deep' : 'obstacle-short';

  let prompt: string;
  try {
    const cadrage =
      kind === 'Obstacle'
        ? "Décris CE QUI BLOQUE. La planète agit comme un moteur mal canalisé, le signe comme une attitude contre-productive, la maison comme le champ de bataille."
        : "Décris CE QUI DÉBLOQUE. La planète est la force à éveiller, le signe la posture gagnante, la maison le levier concret.";

    prompt = await getPrompt(promptKey, {
      kind: kindLabel,
      kindFr,
      planet,
      sign,
      house,
      question: question || 'Aucune question saisie',
      cadrage,
    });
  } catch (err) {
    console.error('[astro-interpretation-obstacle] Erreur chargement prompt:', err);
    return NextResponse.json(
      { interpretation: null, analysis: null, found: false },
      { status: 200 },
    );
  }

  try {
    const maxTokens = mode === 'deep' ? 1200 : 500;
    const temperature = mode === 'deep' ? 0.5 : 0.3;
    const response = await callOracle(prompt, { maxTokens, temperature });
    if (!response) {
      return NextResponse.json(
        { interpretation: null, analysis: null, found: false },
        { status: 200 },
      );
    }

    let text = response.trim();

    // Nettoyer les backticks markdown
    text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();

    // Essayer JSON.parse, puis concaténer les champs
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null) {
        const parts: string[] = [];
        const fields = ['interpretation', 'texte', 'analysis', 'avis', 'message'];
        for (const f of fields) {
          if (typeof parsed[f] === 'string' && parsed[f].trim()) parts.push(parsed[f].trim());
        }
        if (parts.length > 0) text = parts.join('\n\n');
      }
    } catch {
      const allMatches: string[] = [];
      const fieldPattern = /"(?:interpretation|texte|analysis|avis|message)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
      let m;
      while ((m = fieldPattern.exec(text)) !== null) {
        const cleaned = m[1]
          .replace(/\\n/g, '\n')
          .replace(/\\'/g, "'")
          .replace(/\\"/g, '"');
        allMatches.push(cleaned);
      }
      if (allMatches.length > 0) text = allMatches.join('\n\n');
    }

    // Nettoyer guillemets résiduels
    text = text.replace(/^["'\s]+|["'\s]+$/g, '').trim();

    if (mode === 'short') {
      // Limiter à 2 phrases si jamais trop long
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length > 2) {
        text = sentences.slice(0, 2).join('. ').trim() + '.';
      }
      return NextResponse.json({ interpretation: text, found: true });
    } else {
      return NextResponse.json({ analysis: text, found: true });
    }
  } catch (err) {
    console.error('[astro-interpretation-obstacle]', err);
    return NextResponse.json(
      { interpretation: null, analysis: null, found: false },
      { status: 200 },
    );
  }
}
