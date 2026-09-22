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
import { callOracle, extractJsonObject } from '@/lib/llm';
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

function buildNornesPrompt(runes: RuneInput[], question?: string | null): string {
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
vers l'avenir. Dis concrètement quel petit geste poser au présent pour modifier
la trajectoire.${question ? `

LE CONSULTANT INTERROGE LES RUNES SUR CE SUJET PRÉCIS — ancre TOUTE la lecture
dans ce sujet (exemples, ton conseil, ta synthèse doivent s'y rapporter) :
« ${question} »` : ''}

Réponds STRICTEMENT en JSON (pas de texte avant/après, pas de markdown) :
{
  "sections": [
    { "position": "Urd — Le Passé", "rune": "Fehu ᚠ", "sens": "sens réel de la rune", "lecture": "1 à 2 phrases : ce que ce passé a enraciné ici." },
    { "position": "Verdandi — Le Présent", "rune": "...", "sens": "...", "lecture": "1 à 2 phrases : la nécessité présente." },
    { "position": "Skuld — L'Avenir", "rune": "...", "sens": "...", "lecture": "1 à 2 phrases : où mène la trajectoire actuelle." }
  ],
  "synthese": "1 phrase qui résume le fil des Nornes, bienveillante.",
  "conseil_action": "OBLIGATOIRE : 1 phrase d'action concrète à poser aujourd'hui pour infléchir Skuld (Verdandi). Ne JAMAIS omettre cette clé."
}
Réponds UNIQUEMENT avec l'objet JSON.`;
}

function buildNornesOdinPrompt(runes: RuneInput[], question?: string | null): string {
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
(Verdandi) permet de tisser une nouvelle voie. Sois concret et rassurant.${question ? `

Sujet précis du consultant — recentre le conseil sur ce sujet :
« ${question} »` : ''}

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

// Positions canoniques du tirage (le client envoie les libellés dans sa
// langue ; on ne les réécrit pas, on les transmet telles quelles au modèle).
const YGG_ORDER = ["Urðr — la Source", "Níðhöggr — le Dragon", "L’Arbre — la Force du jour", "Les Branches — les Voies vivantes", "L’Aigle — la Vision d’en haut"];

function buildYggdrasilPrompt(runes: RuneInput[], question?: string | null, lang?: string): string {
  const liste = runes
    .map((r, i) => {
      const sens = r.reversed ? `${r.sense} (rune inversée / merkstave)` : r.sense;
      return `Rune ${i + 1} — ${r.position || YGG_ORDER[i] || `Position ${i + 1}`} : ${r.name} ${r.symbol}\n  Sens réel : ${sens}`;
    })
    .join('\n\n');
  const en = lang === 'en';
  return `Tu es un devin scandinave, gardien du mythe d'Yggdrasil. Ton : grave, chaleureux, jamais vague. ${en ? 'Écris TOUTE la réponse en ANGLAIS.' : 'Écris toute la réponse en FRANÇAIS.'}

Le tirage « Les Racines d'Yggdrasil » ne répond pas à une question : il dresse le BILAN d'une vie ou d'un projet, vu comme l'Arbre-Monde. Cinq positions, des fondations au sommet :
• Urðr — la Source (racine qui boit au puits du destin) : ce qui nourrit le consultant SANS QU'IL LE VOIE — fondations, héritage, forces secrètes.
• Níðhöggr — le Dragon (racine rongée) : ce qui ronge en secret — peur, habitude, usure. POSITION PARTICULIÈRE : une rune INVERSÉE y est bienvenue (le danger est enfin nommé) ; une rune droite là signifie que la racine est saine et le consultant lucide. Traite l'inversion comme une RÉVÉLATION utile, jamais comme un malheur.
• L'Arbre — la Force du jour (tronc) : la solidité présente, l'énergie qui porte aujourd'hui.
• Les Branches — les Voies vivantes : les directions réelles qui se déploient, les choix ouverts CETTE SAISON.
• L'Aigle — la Vision d'en haut (couronne) : ce que seul le sommet voit — la vérité que le consultant ne peut pas voir de lui-même, le message à retenir.

Runes tirées (utilise IMPÉRATIVEMENT ces noms, positions et sens réels — ne les invente pas) :
${liste}${question ? `

SUJET DU CONSULTANT — ancre la lecture dans ce sujet précis (exemples, synthèse, conseil) :\n« ${question} »` : '\n\nAucune question posée : le consultant demande un bilan d\'ensemble — parle à sa vie, pas à un dossier.'}

Consigne de fond : lis l'arbre comme UN SEUL organisme — les quatre premières positions s'éclairent mutuellement (la Source nourrit le Tronc, le Dragon ronge la Source, etc.). Termine par ce que l'Aigle voit et pas le consultant.

Réponds STRICTEMENT en JSON (pas de texte avant/après, pas de markdown) :
{
  "sections": [
    ${runes.map((r, i) => `{ "position": "${r.position || YGG_ORDER[i]}", "rune": "${r.name} ${r.symbol}", "sens": "sens réel de la rune (avec la mention merkstave si inversée)", "lecture": "1 à 2 phrases ancrées dans la symbolique de CETTE zone de l'arbre." }`).join(',\n    ')}
  ],
  "synthese": "1 à 2 phrases : l'état général de l'Arbre-Monde du consultant — est-il en sève, en gel, en feu ?",
  "conseil_action": "OBLIGATOIRE : 1 phrase d'action concrète et datable issue de la Vision de l'Aigle. Ne JAMAIS omettre cette clé."
}
Réponds UNIQUEMENT avec l'objet JSON.`;
}

// Positions canoniques du Marteau de Mjölnir (le client envoie les libellés
// dans sa langue ; on ne les réécrit pas, on les transmet telles quelles).
const MJG_ORDER = ['Base du manche — L’Ancrage', 'Haut du manche — L’Obstacle', 'Tête gauche — La Menace', 'Tête droite — L’Arme', 'Centre de la tête — La Frappe'];

function buildMjolnirPrompt(runes: RuneInput[], question?: string | null, lang?: string): string {
  const liste = runes
    .map((r, i) => {
      const sens = r.reversed ? `${r.sense} (rune inversée / merkstave)` : r.sense;
      return `Rune ${i + 1} — ${r.position || MJG_ORDER[i] || `Position ${i + 1}`} : ${r.name} ${r.symbol}\n  Sens réel : ${sens}`;
    })
    .join('\n\n');
  const en = lang === 'en';
  return `Tu es un forgeron-devin du nord, maître de Mjölnir. Ton : martial, lucide, chaleureux — un coach de bataille, jamais un oiseau de malheur. ${en ? 'Écris TOUTE la réponse en ANGLAIS.' : 'Écris toute la réponse en FRANÇAIS.'}

Le tirage « Le Marteau de Mjölnir » ne console pas : il dresse le PLAN DE BATAILLE contre un obstacle qui résiste. Cinq positions, du sol au coup :
• Base du manche — l'Ancrage : sur quoi le consultant s'appuie vraiment (soutien, habitude, certitude). Un manche sans ancrage fait rater le coup.
• Haut du manche — l'Obstacle : la nature EXACTE du blocage, nommée sans complaisance (peur, dépendance, personne, système).
• Tête gauche — la Menace : ce que le coup doit détruire — ce qu'il faut lâcher ou casser. POSITION PARTICULIÈRE : une rune INVERSÉE y est de bon augure (ce qui devait mourir est déjà mourant) ; une rune droite là signale que la menace est encore pleine de vigueur et qu'il faut la nommer plus franchement. Traite l'inversion comme une BONNE NOUVELLE, jamais comme un malheur.
• Tête droite — l'Arme : la force, le talent ou l'allié sous-utilisé qui rend le coup possible.
• Centre de la tête — la Frappe : L'ACTION DÉCISIVE, concrète et datable. Elle ne se lit jamais seule : elle est le verbe des quatre autres positions (avec cet ancrage, contre cet obstacle, en cassant ceci, armé de cela → frapper ainsi).

Runes tirées (utilise IMPÉRATIVEMENT ces noms, positions et sens réels — ne les invente pas) :
${liste}${question ? `\n\nOBSTACLE DU CONSULTANT — ancre la lecture dans CE blocage précis (exemples, synthèse, frappe) :\n« ${question} »` : '\n\nObstacle non nommé : parle au schéma qui se répète dans la vie du consultant, pas à un dossier abstrait.'}

Consigne de fond : le marteau est UN SEUL GESTE — l'Ancrage tend l'Obstacle, l'Obstacle désigne la Menace, l'Arme rend la Frappe possible. Pas de fatalité : chaque zone se termine sur ce que le consultant peut faire de l'information.

Réponds STRICTEMENT en JSON (pas de texte avant/après, pas de markdown) :
{
  "sections": [
    ${runes.map((r, i) => `{ "position": "${r.position || MJG_ORDER[i]}", "rune": "${r.name} ${r.symbol}", "sens": "sens réel de la rune (avec la mention merkstave si inversée)", "lecture": "1 à 2 phrases ancrées dans la symbolique de CETTE zone du marteau." }`).join(',\n    ')}
  ],
  "synthese": "1 à 2 phrases : le verdict du forgeron — le coup est-il prêt à partir, faut-il recaler la prise, ou forger l'arme d'abord ?",
  "conseil_action": "OBLIGATOIRE : la Frappe — 1 phrase d'action concrète et datable qui relie ancrage, arme et menace. Ne JAMAIS omettre cette clé."
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
    const qTopic = typeof body.question === 'string' ? body.question.trim().slice(0, 400) : null;
    prompt = focus === 'odin' ? buildNornesOdinPrompt(runes, qTopic) : buildNornesPrompt(runes, qTopic);
  } else if (m === 'yggdrasil') {
    prompt = buildYggdrasilPrompt(runes, typeof body.question === 'string' ? body.question.trim().slice(0, 400) : null, body.lang === 'en' ? 'en' : 'fr');
  } else if (m === 'mjolnir') {
    prompt = buildMjolnirPrompt(runes, typeof body.question === 'string' ? body.question.trim().slice(0, 400) : null, body.lang === 'en' ? 'en' : 'fr');
  }

  const content = (await callOracle(prompt)) || '';
  if (!content || content.trim().length === 0) {
    return NextResponse.json(
      { texte: 'Les brumes de Midgard voilent les runes… L’analyse n’a pas pu être générée. Recommence plus tard.' },
      { status: 200 },
    );
  }
  // Les petits modèles gratuits (secours) omettent parfois « conseil_action »
  // ou répondent en prose. Une relance UNIQUE le réclame explicitement.
  let json = extractJsonObject(content) as Record<string, any>;
  if (json && Array.isArray(json.sections) && !String(json.conseil_action || '').trim()) {
    const retry = (await callOracle(prompt + '\n\nRAPPEL ABSOLU : le JSON DOIT contenir la clé "conseil_action" (1 phrase d\'action concrète). Ne renvoie QUE l\'objet JSON complet.')) || '';
    const jsonRetry = extractJsonObject(retry) as Record<string, any>;
    if (jsonRetry && Array.isArray(jsonRetry.sections) && String(jsonRetry.conseil_action || '').trim()) {
      json = jsonRetry;
    }
  }
  try {
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
