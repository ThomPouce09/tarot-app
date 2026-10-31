// app/api/astro-choix-verdict/route.ts — Le VERDICT DU DUEL (Tirage du choix v2).
// Un SEUL tirage (la lumière de la décision) ; le consultant a déposé deux
// options (A, B, + le nœud facultatif). La route :
//  1) calcule elle-même la STRUCTURE du duel (lib/duel-structure.ts — faits
//     déterministes, jamais dévinés par l'IA), rendus tout de suite à l'UI
//     pour la pesée animée des glyphes ;
//  2) appelle l'oracle avec ces faits + les deux options + le profil (si le
//     consultant EST le sujet) → un JSON d'arbitrage professionnel ;
//  3) sanitize et renvoie { structure, verdict } — l'UI diffuse les glyphes
//     pendant l'appel, puis FIGE la balance sur le verdict (correction visible).
// Quota : une fenêtre 'des-choix' par parcours (1 tirage = 1 conso).

import { NextRequest, NextResponse } from 'next/server';
import { callOracle, extractJsonObject, LONG_REQUEST_TIMEOUT_MS } from '@/lib/llm';
import { getPrompt } from '@/lib/prompts';
import { guardRequest } from '@/lib/quota-guard';
import { buildProfileBlock, injectProfile } from '@/lib/profile';
import { resolveLang } from '@/lib/lang';
import { PLANET_NAMES, SIGN_NAMES } from '@/components/astro-dice/names';
import { computeDuel, duelFactsBlock, type Side } from '@/lib/duel-structure';
import { ORACLE_ASTRO_STANCE } from '@/lib/oracle-stance';

const LANG_NAMES: Record<string, string> = { fr: 'le français', en: 'l\'anglais', es: 'l\'espagnol', hi: 'l\'hindi (देवनागरी)' };

// Prompt de SECOURS (si la table PromptTemplate n'a pas encore 'choix-duel' —
// le seed viendra l'éditer en base ; le code ne doit jamais être bloqué).
const FALLBACK_PROMPT = `Tu es la voyante du DUEL : le consultant a déposé devant toi DEUX options, et UN SEUL lancer de Dés du Zodiaque éclaire sa décision. Ta mission : arbitrer, pas hésiter à sa place.

{{facts}}

CONTEXTE DE LA CONSULTATION :
• Question/lien entre les deux : {{knot}}
• Mémorises la formulation exacte du consultant pour A et B ; garde-la, ne la reformule pas en généralité.

RÈGLES DU VERDICT (professionnel, pas horoscope) :
1. SUJET D'ABORD : décide si le consultant PARLE DE LUI (sa vie, son choix) ou d'autre chose (un tiers, une situation impersonnelle). Le profil (« le consultant en quelques mots ») ne s'utilise QUE s'il est le sujet. Sinon, silence du profil.
2. ARGUMENTE LES DEUX : "developA" et "developB" — ce que la force du tirage (moteur), sa méthode (tempo) et surtout son TERRAIN (la maison) font vraiment peser sur CHAQUE option, en s'appuyant sur les mots du consultant. 2-4 phrases chacun, concret.
3. LES DEUX VIES : "consequenceA" et "consequenceB" — la suite probable à horizon 6-18 mois SI c'est lui le sujet : dans sa vie réelle (son foyer, son métier, ses proches — les éléments du profil quand ils collent au terrain), pas de vague. 2-3 phrases chacun.
4. VERDICT : "pesees" — les TROIS faces du tirage se posent sur UN SEUL plateau chacune (aucune face neutre, aucune face « les deux » : tu es l'arbitre, tu tranches chaque face). "pour" vaut "A" ou "B" ; "mot" = 3-9 mots qui disent POURQUOI cette face penche là, en s'appuyant sur les mots du consultant pour CE plateau. Tu confirmes ou infirmes l'indice du moteur, face par face. Puis "balance" = le plateau MAJORITAIRE (2-1 ou 3-0 — la balance TOMBE toujours : c'est une aide à la décision, pas une constatation).
5. HONNÊTETÉ DANS LE VERDICT : la balance penche toujours, mais le DEGRÉ est ton message : 3-0 = conviction franche ; 2-1 = victoire à la pesée — "tranche" le dit tel quel et "conditionRenverse" nomme ce qui ferait basculer la face restante. Jamais de Barnum : le motif de chaque face doit être vérifiable dans SON plateau.
6. "angleMorts" : 1-2 phrases — ce que le consultant NE VOIT PAS dans son hésitation (l'angle mort des deux options à la fois).
7. "troisiemeLumiere" : 1-2 phrases MAX — la porte que son hésitation cachait et qu'il n'a pas proposée. Sobre, jamais un conseil de développement personnel.
8. "resume" : 2 phrases, la conclusion qu'on retient.

LANGUE : ENTIEREMENT en {{langName}} (analyse ET "mot" des pesées), vouvoiement poli, ton de voyante professionnelle — franche, chaude, précise.

Réponds STRICTEMENT en JSON (aucun texte avant/après, pas de markdown) :
{ "pesees": [ { "face": "planet", "pour": "A", "mot": "…" }, { "face": "sign", "pour": "both", "mot": "…" }, { "face": "house", "pour": "B", "mot": "…" } ],
  "balance": "A",
  "tranche": "…", "developA": "…", "developB": "…",
  "consequenceA": "…", "consequenceB": "…", "angleMorts": "…",
  "conditionRenverse": "…", "troisiemeLumiere": "…", "resume": "…" }`;

function clip(v: unknown, max: number): string {
  return String(v ?? '').trim().slice(0, max);
}

const VALID_POUR = new Set<string>(['A', 'B']);
const VALID_FACE = new Set<string>(['planet', 'sign', 'house']);

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { faces, optionA, optionB, knot, lang } = body || {};
  const a = clip(optionA, 240);
  const b = clip(optionB, 240);
  const k = clip(knot, 300);
  if (!faces || !faces.planet || !faces.sign || !faces.house) {
    return NextResponse.json({ error: 'faces requis (planet, sign, house)' }, { status: 400 });
  }
  if (a.length < 10 || b.length < 10) {
    return NextResponse.json({ error: 'Deux options d\'au moins 10 caractères' }, { status: 400 });
  }

  // Quota : une fenêtre « des-choix » (identique à l'ancienne route courte).
  const guarded = await guardRequest(request, body, 'des-choix');
  if ('error' in guarded) return guarded.error;

  // ── 1) STRUCTURE calculée par le code — rendue même si l'IA se tait. ──
  const structure = computeDuel(faces, a, b);
  const facts = duelFactsBlock(structure, a, b);

  const L = resolveLang(lang);
  const langName = LANG_NAMES[L] || LANG_NAMES.fr;

  // ── 2) Verdict de l'oracle. ──
  let verdict: Record<string, string> | null = null;
  let peseesIA: { face: string; pour: Side; mot: string }[] | null = null;
  let balanceIA: Side | null = null;
  try {
    let prompt: string;
    try {
      prompt = await getPrompt('choix-duel', {
        facts,
        knot: k || 'non précisé',
        langName,
        optionA: a,
        optionB: b,
      });
    } catch {
      // PromptTemplate absent (avant seed) : fallback embarqué, mêmes variables.
      prompt = FALLBACK_PROMPT
        .replace(/\{\{facts\}\}/g, facts)
        .replace(/\{\{knot\}\}/g, k || 'non précisé')
        .replace(/\{\{langName\}\}/g, langName);
    }
    prompt = ORACLE_ASTRO_STANCE + prompt;
    prompt = injectProfile(prompt, await buildProfileBlock(guarded.email));

    const content = (await callOracle(prompt, { maxTokens: 1500, temperature: 0.5, timeoutMs: LONG_REQUEST_TIMEOUT_MS })) || '';
    const json = extractJsonObject(content);
    if (json && (json.tranche || json.resume || json.developA || json.balance)) {
      // pesées corrigées par l'IA (défense : faces connues, 'pour' normalisé)
      if (Array.isArray(json.pesees)) {
        // face ambiguë ou absente → la réponse du MOTEUR pour cette face :
        // chaque face finit sur UN plateau, le verdict ne peut être que majoritaire.
        const moteurByFace = new Map(structure.pesees.map((q) => [q.face, q.pour]));
        peseesIA = (['planet', 'sign', 'house'] as const).map((f) => {
          const raw = (json.pesees as any[]).find((x) => x && String(x.face) === f);
          let pour = raw ? String(raw.pour ?? '').trim() : '';
          if (!VALID_POUR.has(pour)) pour = moteurByFace.get(f) as string;
          return { face: f, pour: pour as Side, mot: clip(raw?.mot, 60) };
        });
      }
      // balance = MAJORITÉ des pesées (le champ "balance" de l'IA est vérifié,
      // pas cru sur parole) — 3 faces strictes → jamais d'égalité.
      if (peseesIA) {
        const nA = peseesIA.filter((x) => x.pour === 'A').length;
        balanceIA = nA >= 2 ? 'A' : 'B';
      } else if (json.balance === 'A' || json.balance === 'B') {
        balanceIA = json.balance;
      }
      verdict = {
        tranche: clip(json.tranche, 600),
        developA: clip(json.developA, 900),
        developB: clip(json.developB, 900),
        consequenceA: clip(json.consequenceA, 700),
        consequenceB: clip(json.consequenceB, 700),
        angleMorts: clip(json.angleMorts, 500),
        conditionRenverse: clip(json.conditionRenverse, 500),
        troisiemeLumiere: clip(json.troisiemeLumiere, 400),
        resume: clip(json.resume, 400),
      };
    }
  } catch (err) {
    console.error('[astro-choix-verdict]', err);
  }

  // Repli silencieux : sans IA, le moteur assume sa propre lecture (l'UI
  // affichera la balance du moteur, textees par les faits calculés).
  if (!verdict) {
    const pNames = {
      planet: PLANET_NAMES[String(faces.planet)] ?? String(faces.planet),
      sign: SIGN_NAMES[String(faces.sign)] ?? String(faces.sign),
    };
    const bal = structure.balance;
    verdict = {
      tranche: `La balance du ciel penche vers le chemin ${bal} : ${structure.moteur}, au tempo ${structure.tempo}, sur le terrain ${structure.terrain}.`,
      developA: `Le tirage (moteur ${pNames.planet}, méthode ${pNames.sign}, terrain maison ${faces.house}) n'exclut pas votre option A.`,
      developB: `Le tirage n'exclut pas votre option B non plus.`,
      consequenceA: '', consequenceB: '',
      angleMorts: '',
      conditionRenverse: `Si le chemin ${bal === 'A' ? 'B' : 'A'} cesse de vous peser pour vous rassurer, revenez sur ce verdict.`,
      troisiemeLumiere: '',
      resume: `Le ciel incline vers le chemin ${bal}, sans fermer l'autre.`,
    };
  }

  return NextResponse.json({
    structure,        // pesees MOTEUR (diffusion animée)
    verdict,          // texte d'arbitrage
    peseesIA,         // correction IA (peut être null → garder le moteur)
    balanceIA,        // null → garder la balance du moteur
    found: true,
  });
}
