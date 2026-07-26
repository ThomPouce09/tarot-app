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

    // Nettoyer les backticks markdown
    text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();

    // Essayer JSON.parse, puis concaténer tous les champs textuels
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null) {
        // Concaténer tous les champs de texte dans l'ordre préféré
        const parts: string[] = [];
        const fields = ['texte', 'analysis', 'interpretation', 'conclusion', 'resume', 'detail', 'avis', 'message'];
        for (const f of fields) {
          if (typeof parsed[f] === 'string' && parsed[f].trim()) parts.push(parsed[f].trim());
        }
        if (parts.length > 0) {
          text = parts.join('\n\n');
        }
        // Si aucun champ textuel trouvé, garder le JSON original
      }
    } catch {
      // Pas du JSON valide → extraire la première valeur textuelle via regex robuste
      // On cherche tous les champs possibles
      const allMatches: string[] = [];
      const fieldPattern = /"(?:texte|analysis|interpretation|conclusion|resume|detail|avis|message)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
      let m;
      while ((m = fieldPattern.exec(text)) !== null) {
        // Nettoyer les échappements
        const cleaned = m[1]
          .replace(/\\n/g, '\n')
          .replace(/\\'/g, "'")
          .replace(/\\"/g, '"')
          .replace(/\\t/g, '\t');
        allMatches.push(cleaned);
      }
      if (allMatches.length > 0) {
        text = allMatches.join('\n\n');
      } else {
        // Dernier recours : garder le texte brut mais enlever les artefacts JSON
        text = text
          .replace(/^\{/, '')
          .replace(/\}$/, '')
          .replace(/"[^"]+":\s*"/g, '')   // enlever les clés JSON
          .replace(/"\s*,?\s*$/gm, '')     // enlever les guillemets fermants
          .replace(/",/g, '')
          .trim();
      }
    }

    // Post-nettoyage : enlever les guillemets résiduels aux extrémités
    text = text.replace(/^["'\s]+|["'\s]+$/g, '').trim();

    return NextResponse.json({ analysis: text });
  } catch (err) {
    console.error('[astro-interpretation-approfondie]', err);
    return NextResponse.json({ analysis: null }, { status: 200 });
  }
}
