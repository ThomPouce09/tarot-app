// app/api/rune-interpretation/route.ts
//
// Interprétation LLM des Runes Scandinaves (Elder Futhark). Reçoit la liste
// des runes tirées (avec leur position, leur sens réel et si elle est
// inversée) + le mode (type de tirage) et renvoie une analyse structurée
// via la cascade callOracle (clés serveur).
//
// La page affiche en parallèle une analyse STATIQUE (runes.ts, 100% client)
// pendant cet appel.

import { NextRequest, NextResponse } from 'next/server';
import { callOracle } from '@/lib/llm';
import { enforceGate } from '@/lib/gate-server';

type Mode = 'nornes' | 'mjolnir' | 'yggdrasil';

const VALID_MODES: Mode[] = ['nornes', 'mjolnir', 'yggdrasil'];

// Type d'une rune envoyée par le client (sens déjà résolu côté page).
interface RuneInput {
  name: string;
  symbol: string;
  position: string;
  sense: string; // sens réel (upright ou reversed) issu de runes.ts
  reversed: boolean;
}

// Extrait le 1er objet JSON valide d'une réponse LLM (même robustesse que l'existant).
function extractJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildNornesPrompt(runes: RuneInput[]): string {
  const liste = runes
    .map((r, i) => {
      const sens = r.reversed ? `${r.sense} (rune inversée / merkstave)` : r.sense;
      return `Rune ${i + 1} — ${r.position} : ${r.name} ${r.symbol}\n  Sens réel : ${sens}`;
    })
    .join('\n\n');

  return `Tu es un devin scandinave, ton chaleureux et clair, en français courant.

RAPPEL DU TIrage "Le Fil des Nornes" (3 runes + Conseil d'Odin) :
• Urd — Le Passé : les origines, ce qui est déjà accompli.
• Verdandi — Le Présent : la nécessité actuelle, le mouvement en cours.
• Skuld — L'Avenir : l'aboutissement logique si rien ne change.
• Conseil d'Odin : l'action précise à mener AUJOURD'HUI (Verdandi) pour infléchir Skuld.

Runes tirées :
${liste}

IMPORTANT : utilise IMPÉRATIVEMENT ces noms et ces sens réels (ne les invente pas).

Lis le fil comme une histoire continue : le passé a engendré le présent, qui mène
vers l'avenir. Si une 4e rune (Conseil d'Odin) est présente, dis concrètement quel
petit geste poser au présent pour modifier la trajectoire.

Réponds STRICTEMENT en JSON (pas de texte avant/après, pas de markdown) :
{
  "sections": [
    { "position": "Urd — Le Passé", "rune": "Fehu ᚠ", "sens": "sens réel de la rune", "lecture": "1 à 2 phrases : ce que ce passé a enraciné ici." },
    { "position": "Verdandi — Le Présent", "rune": "...", "sens": "...", "lecture": "1 à 2 phrases : la nécessité présente." },
    { "position": "Skuld — L'Avenir", "rune": "...", "sens": "...", "lecture": "1 à 2 phrases : où mène la trajectoire actuelle." }
  ],
  "synthese": "1 phrase qui résume le fil des Nornes, bienveillante.",
  "conseil_action": "Si une 4e rune (Conseil d'Odin) est présente : 1 phrase d'action concrète à poser aujourd'hui. Sinon : une phrase pour accueillir l'avenir."
}
Réponds UNIQUEMENT avec l'objet JSON.`;
}

function buildNornesOdinPrompt(runes: RuneInput[]): string {
  // Les 3 premières runes = le fil des Nornes ; la dernière = Conseil d'Odin.
  const nornes = runes.slice(0, 3);
  const odin = runes[runes.length - 1];
  const fil = nornes
    .map((r, i) => {
      const pos = ['Urd — Le Passé', 'Verdandi — Le Présent', 'Skuld — L’Avenir'][i];
      const sens = r.reversed ? `${r.sense} (rune inversée / merkstave)` : r.sense;
      return `${pos} : ${r.name} ${r.symbol} — ${sens}`;
    })
    .join('\n');
  const odinSens = odin.reversed ? `${odin.sense} (rune inversée / merkstave)` : odin.sense;

  return `Tu es un devin scandinave, ton clair et bienveillant, en français courant.

Le fil des Nornes (tirage initial) :
${fil}

Le Conseil d'Odin (4e rune, à analyser) :
${odin.name} ${odin.symbol} — ${odinSens}

IMPORTANT : utilise IMPÉRATIVEMENT ces noms et ces sens réels (ne les invente pas).

Explique comment la rune du Conseil d'Odin ÉCLAIRE et MODIFIE le fil :
quelle porte elle ouvre sur l'avenir (Skuld), et quel petit geste au présent
(Verdandi) permet de tisser une nouvelle voie. Sois concret et rassurant.

Réponds STRICTEMENT en JSON (pas de texte avant/après, pas de markdown) :
{
  "sections": [
    { "position": "Conseil d'Odin", "rune": "${odin.name} ${odin.symbol}", "sens": "${odinSens}", "lecture": "2 à 3 phrases : le sens de cette rune ET comment elle infléchit le fil des 3 Nornes (passé/présent/avenir)." }
  ],
  "synthese": "1 phrase : la nouvelle direction ouverte par le Conseil d'Odin.",
  "conseil_action": "1 phrase d'action concrète à poser aujourd'hui pour tisser cette nouvelle voie."
}
Réponds UNIQUEMENT avec l'objet JSON.`;
}

export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const m = (body.mode as Mode) || 'nornes';
  if (!VALID_MODES.includes(m)) {
    return NextResponse.json({ error: `mode invalide : ${body.mode}` }, { status: 400 });
  }

  // ── Gating serveur : consomme le quota du type de tirage (base/avancé). ──
  const gate = await enforceGate(body.userId ? String(body.userId) : null, body.type || `runes-${m}`, body.question ?? null);
  if (gate) return gate;

  const focus = body.focus === 'odin' ? 'odin' : 'global';
  const runes: RuneInput[] = Array.isArray(body.runes) ? body.runes : [];
  if (runes.length === 0) {
    return NextResponse.json({ error: 'runes requis' }, { status: 400 });
  }

  let prompt = '';
  if (m === 'nornes') {
    prompt = focus === 'odin' ? buildNornesOdinPrompt(runes) : buildNornesPrompt(runes);
  }
  // mjolnir / yggdrasil : ajoutés ensuite

  const content = (await callOracle(prompt)) || '';
  if (!content || content.trim().length === 0) {
    return NextResponse.json(
      { texte: 'Les brumes de Midgard voilent les runes… L’analyse n’a pas pu être générée. Recommence plus tard.' },
      { status: 200 },
    );
  }
  try {
    const json = extractJson(content);
    if (json && Array.isArray(json.sections)) {
      const sections = (json.sections as any[])
        .filter((s) => s && s.lecture && String(s.lecture).trim().length > 0)
        .map((s) => ({
          position: s.position || '',
          rune: s.rune || '',
          sens: s.sens || '',
          lecture: s.lecture,
        }));
      return NextResponse.json({
        sections,
        synthese: json.synthese || '',
        conseil_action: json.conseil_action || '',
        texte: content.trim(),
      });
    }
  } catch {
    // ignore → fallback ci-dessous
  }
  return NextResponse.json({ texte: content.trim() });
}
