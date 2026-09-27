// app/api/astro-voies/route.ts
// « Les Voies » — à partir du tirage d'Obstacle, l'oracle trace 4 voies
// incarnées pour le traverser. Le tirage de Solution se jouera SUR la voie
// choisie. Réponse JSON stricte ; filet de sécurité : si le LLM échoue ou
// sort du format, 4 voies archétypales (Feu/Eau/Air/Terre) sont retournées.

import { NextRequest, NextResponse } from 'next/server';
import { callOracle, extractJsonObject } from '@/lib/llm';

export const maxDuration = 60;

const FALLBACK_VOIES = {
  fr: [
    { id: 'fire', glyph: '♈', name: 'La Voie du Feu', motto: 'Affronter maintenant, d’un acte franc et immédiat.' },
    { id: 'water', glyph: '♋', name: 'La Voie de l’Eau', motto: 'Contourner sans rupture, laisser le temps dénouer.' },
    { id: 'air', glyph: '♎', name: 'La Voie du Souffle', motto: 'Nommer le blocage, en parler pour le transformer.' },
    { id: 'earth', glyph: '♑', name: 'La Voie de la Terre', motto: 'Bâtir patiemment, un petit geste sûr chaque jour.' },
  ],
  en: [
    { id: 'fire', glyph: '♈', name: 'Path of Fire', motto: 'Face it now, with one bold and immediate act.' },
    { id: 'water', glyph: '♋', name: 'Path of Water', motto: 'Flow around it; let time loosen the knot.' },
    { id: 'air', glyph: '♎', name: 'Path of Breath', motto: 'Name the block, speak it into transformation.' },
    { id: 'earth', glyph: '♑', name: 'Path of Earth', motto: 'Build patiently — one sure gesture each day.' },
  ],
} as const;

function buildPrompt(planet: string, sign: string, house: string, question: string | null, lang: string): string {
  const langue = lang === 'en' ? 'anglais' : 'français';
  return `Tu es l'oracle d'un tirage de dés zodiacaux « Obstacle & Solution ».

Obstacle tiré : la planète ${planet} dans le signe ${sign}, Maison ${house}.
Question du consultant : ${question || 'aucune question précise'}.

Trace EXACTEMENT 4 voies distinctes et incarnées pour traverser cet obstacle.
Chaque voie est une ATTITUDE (ni un conseil générique, ni une description
astrologique) : un nom court et beau (3-4 mots maximum), et un motto d'une
seule phrase d'action concrète (12 mots maximum). Les 4 voies doivent se
répondre et s'opposer fécondement (affronter / contourner / transformer /
enraciner, ou tes équivalents inspirés du tirage).

ids imposés : fire, water, air, earth (dans cet ordre).
Réponds UNIQUEMENT avec ce JSON, tout en ${langue} :
{"voies":[{"id":"fire","name":"...","motto":"..."},{"id":"water","name":"...","motto":"..."},{"id":"air","name":"...","motto":"..."},{"id":"earth","name":"...","motto":"..."}]}`;
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { planet, sign, house, question, lang = 'fr' } = body || {};
  if (!planet || !sign || !house) {
    return NextResponse.json({ error: 'Champs requis : planet, sign, house' }, { status: 400 });
  }

  const fallback = (lang === 'en' ? FALLBACK_VOIES.en : FALLBACK_VOIES.fr).map((v) => ({ ...v }));
  const glyphs: Record<string, string> = { fire: '♈', water: '♋', air: '♎', earth: '♑' };

  // ── Mode « les dés choisissent » : l'oracle départage les 4 voies. ──
  if (Array.isArray(body.voies) && body.voies.length === 4) {
    const voies = body.voies as { id: string; name: string; motto: string }[];
    const liste = voies.map((v) => `- ${v.id} : ${v.name} — ${v.motto}`).join('\n');
    const choosePrompt = `Tu es l'oracle d'un tirage « Obstacle & Solution » de dés zodiacaux.
Obstacle : ${planet} en ${sign}, Maison ${house}. Question : ${question || 'aucune'}.
Quatre voies possibles :
${liste}

Choisis LA voie la plus avisée pour traverser cet obstacle (celle qui débloque
vraiment, pas la plus confortable). Réponds UNIQUEMENT en JSON :
{"id":"<l'id exact parmi fire|water|air|earth>","reason":"<une phrase courte d'inspiration, max 18 mots, dans la langue de la question (français par défaut)>", "reasonEn":"<la même phrase en anglais>"}`;
    try {
      const raw = await callOracle(choosePrompt, { maxTokens: 500, temperature: 0.8, timeoutMs: 40_000 });
      const parsed = extractJsonObject(raw || '');
      const id = String(parsed?.id || '').toLowerCase();
      const valid = voies.find((v) => v.id === id);
      if (valid) {
        return NextResponse.json({
          chosenId: valid.id,
          reason: lang === 'en' ? (parsed.reasonEn || parsed.reason || null) : (parsed.reason || null),
          fromOracle: true,
        });
      }
    } catch (err) {
      console.error('[astro-voies] départage LLM indisponible :', err);
    }
    // Filet mystérieux : le sort tranche lui-même.
    const v = voies[Math.floor(Math.random() * 4)];
    return NextResponse.json({ chosenId: v.id, reason: null, fromOracle: false });
  }

  try {
    const raw = await callOracle(buildPrompt(planet, sign, house, question || null, lang), {
      maxTokens: 900,
      temperature: 0.9,
      timeoutMs: 45_000,
    });
    const parsed = extractJsonObject(raw || '');
    const voies: any[] = Array.isArray(parsed?.voies) ? parsed.voies : [];
    const clean = voies
      .filter((v) => v && typeof v.name === 'string' && typeof v.motto === 'string')
      .slice(0, 4)
      .map((v, i) => ({
        id: String(v.id || ['fire', 'water', 'air', 'earth'][i]),
        glyph: glyphs[String(v.id || '')] || fallback[i]?.glyph || '✦',
        name: String(v.name).trim().slice(0, 40),
        motto: String(v.motto).trim().slice(0, 90),
      }));
    if (clean.length === 4) {
      return NextResponse.json({ voies: clean, fromOracle: true });
    }
  } catch (err) {
    console.error('[astro-voies] LLM indisponible, voies archétypales :', err);
  }
  return NextResponse.json({ voies: fallback, fromOracle: false });
}
