// app/api/astro-interpretation-obstacle/route.ts
// Interprétations LLM pour Obstacle & Solution.
// Prompt chargé depuis la base Neon (clés 'obstacle-short' ou 'obstacle-deep').

import { NextRequest, NextResponse } from 'next/server';
import { callOracle, extractJsonObject } from '@/lib/llm';
import { getPrompt } from '@/lib/prompts';
import { guardRequest } from '@/lib/quota-guard';
import { buildProfileBlock, injectProfile } from '@/lib/profile';
import { resolveLang, outputDirective } from '@/lib/lang';
import { checkPerk, consumePerk, perkReasonCode } from '@/lib/perks';
import { clampTwoSentences } from '@/lib/artemis-secret';
import { ORACLE_ASTRO_STANCE } from '@/lib/oracle-stance';

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { planet, sign, house, question, kind, mode = 'short', lang } = body || {};
  // ── Secret d'Artémis FUSIONNÉ (Obstacle & Solution) : quand la Solution
  //    est demandée en mode 'deep' avec withArtemis + obstacleFaces + voie,
  //    le MÊME appel IA renvoie { analysis, artemis } — le chuchotement naît
  //    de l'obstacle lu à travers la voie choisie. Privilège : 1/mois Initié,
  //    illimité Arkane (compteur partagé avec l'affinage).
  const wantArtemis =
    mode === 'deep' && kind === 'Solution' &&
    body?.withArtemis === true && !!body?.obstacleFaces && typeof body?.voie === 'string';
  const originalQuestion = typeof body?.originalQuestion === 'string' ? body.originalQuestion.trim() : '';
  if (!planet || !sign || !house || !kind) {
    return NextResponse.json(
      { error: 'Champs requis : planet, sign, house, kind' },
      { status: 400 },
    );
  }

  // ── Session + quota : Obstacle & Solution (fenêtre partagée avec les Voies
  //    et le second côté du tirage : un tirage = une consommation). ──
  const guarded = await guardRequest(request, body, 'des-obstacle-solution');
  if ('error' in guarded) return guarded.error;

  const kindLabel = kind === 'Obstacle' ? 'Obstacle' : 'Solution';
  const kindFr =
    kind === 'Obstacle' ? "l'Obstacle" : "la Solution";

  const promptKey = mode === 'deep' ? 'obstacle-deep' : 'obstacle-short';

  // ── Privilège « Secret d'Artémis » : vérifié AVANT de payer l'appel long.
  //    Refus (tier/limit) : on sert le prompt deep NORMAL — l'analyse due
  //    arrive sans chuchotement + champ artemisBlocked pour que l'UI ouvre la
  //    modale de gate au clic sur « Révéler ».──
  let artemisBlocked: string | null = null;
  let fusedArtemis = wantArtemis;
  if (wantArtemis) {
    const pre = await checkPerk(guarded.email, 'artemis');
    if (!pre.allowed) {
      fusedArtemis = false;
      artemisBlocked = perkReasonCode(pre.reason);
    }
  }

  const LANG_NAMES: Record<string, string> = { fr: 'en français', en: 'in English', es: 'en español', hi: 'in हिन्दी' };
  const langName = LANG_NAMES[resolveLang(lang)] || 'en français';
  let prompt: string;
  if (fusedArtemis) {
    const of = body.obstacleFaces as Record<string, string | number>;
    prompt = `Tu es une astrologue d'une grande finesse : lucide, bienveillante, ancrée — une sagesse féminine incarnée, jamais mièvre. Tu ne nommes JAMAIS le « féminin » ni la « féminité » : tu l'incarnes par le ton.

Obstacle posé par les Dés zodiacaux (Planète × Signe × Maison) :
• planet = ${of.planet ?? '?'} — le moteur mal canalisé
• sign = ${of.sign ?? '?'} — l'attitude contre-productive
• house = ${of.house ?? '?'} — le champ de bataille

La voie retenue par l'oracle pour la LEVER : ${body.voie}

${originalQuestion ? `Question INITIALE du consultant (celle qu'il a posée à l'Oracle, que la voie précise sans la remplacer) : « ${originalQuestion} »` : `Question du consultant : ${question || 'Aucune question saisie'}`}

Lance actuel de la Solution (les faces qui débloquent) :
• planet = ${planet} — la force à éveiller
• sign = ${sign} — la posture gagnante
• house = ${house} — le levier concret

LANGUE IMPOSÉE — NON NÉGOCIABLE : la personne ne lit que ${langName}. CHACUNE des deux valeurs ("analysis" ET "artemis") doit être intégralement rédigée ${langName}, y compris les noms des astres dans la langue cible. Ne jamais mélanger les langues, jamais répondre dans une autre langue que ${langName}.

Deux réponses, dans le même objet JSON :
1. "analysis" : ce que CE lancer de Solution — lu dans la voie « ${body.voie} » et en réponse DIRECTE à l'obstacle ci-dessus — dit au consultant. ${originalQuestion ? `Elle répond D'ABORD et SANS AMBIGUÏTÉ à la question initiale « ${originalQuestion} » : cette question reste LE sujet de la consultation, la voie n'en est que l'angle d'attaque — reviens-y nommément, ne la perds jamais de vue, ne réponds pas à côté.` : `Reste collé à la question posée — ne réponds jamais à côté.`} 350-550 mots, 2e personne, concret : nomme le blocage précis (planète/signe/maison de l'obstacle), puis la manœuvre que la Solution ouvre dans cette voie, étape par étape. Jamais de maxime générale.
2. "artemis" : le SECRET d'Artémis. TU ES ARTÉMIS. La consultante ou le consultant est devant toi, à genoux dans la clairière, et vient de confier son problème (ci-dessus) ; les dés viennent de révéler l'obstacle, la voie et la solution. Tu lui chuchotes exactement DEUX phrases courtes — pas une de plus, pas une de moins, séparées par un POINT — un conseil direct, adressé à cette personne : première phrase : tu désignes ce qu'elle doit voir ou faire, ici, demain, dans sa vraie vie (le foyer, un mot à dire, une décision à porter — ancré dans la maison et la voie posées) ; seconde phrase : tu nommes l'énergie que tu mets dans sa main, en UN verbe (trancher, se taire, attendre, dire, refuser…). « Tu » tutoyé de déesse à mortelle : grave, bref, concret — une flèche qui traverse une cuirasse, jamais une maxime générale, jamais un manuel d'actions (terrain du Conseil d'Odin), jamais un résumé du point 1.
   FRANÇAIS IMPECCABLE EXIGÉ (si ${langName} est le français) : chaque phrase est une phrase GRAMATICALE COMPLÈTE — sujet + verbe conjugué + complément — comme une déesse qui parle, pas une énumération de noms collés (« la force tranquille accepte » est INTERDIT). Pas de virgules à la place des points, pas d'anglais qui déborde, pas de mots inventés. Relis-toi : si une phrase ne serait pas écrite telle quelle par une romancière française, réécris-la.
Réponds STRICTEMENT en JSON (pas de texte avant/après, pas de markdown) :
{ "analysis": "...", "artemis": "..." }`;
  } else
  try {
    const cadrage =
      kind === 'Obstacle'
        ? "Décris CE QUI BLOQUE. La planète agit comme un moteur mal canalisé, le signe comme une attitude contre-productive, la maison comme le champ de bataille."
        : "Décris CE QUI DÉBLOQUE. La planète est la force à éveiller, le signe la posture gagnante, la maison le levier concret.";

    // Le second lancer porte la VOIE comme question : sans rappel explicite,
    // l'IA oublierait la question INITIALE du consultant (retour user).
    const qEff = originalQuestion && String(question || '') !== originalQuestion
      ? `${question || ''}\n(la question initiale du consultant, à laquelle cette lecture répond : « ${originalQuestion} »)`
      : (question || 'Aucune question saisie');
    prompt = await getPrompt(promptKey, {
      kind: kindLabel,
      kindFr,
      planet,
      sign,
      house,
      question: qEff,
      cadrage,
    });
  } catch (err) {
    console.error('[astro-interpretation-obstacle] Erreur chargement prompt:', err);
    return NextResponse.json(
      { interpretation: null, analysis: null, found: false },
      { status: 200 },
    );
  }

  // ── Posture voyante astrologue (toutes branches) + profil oracle. ──
  prompt = ORACLE_ASTRO_STANCE + prompt;
  // ── Profil oracle (optionnel) : « le consultant en quelques mots ». ──
  prompt = injectProfile(prompt, await buildProfileBlock(guarded.email));

  try {
    const maxTokens = fusedArtemis ? 1600 : mode === 'deep' ? 1200 : 500;
    const temperature = mode === 'deep' ? 0.5 : 0.3;
    const response = await callOracle(prompt + outputDirective(resolveLang(lang)), { maxTokens, temperature });
    if (!response) {
      return NextResponse.json(
        { interpretation: null, analysis: null, found: false },
        { status: 200 },
      );
    }

    let text = response.trim();

    // Nettoyer les backticks markdown
    text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();

    // ── Sortie fusionnée Obstacle & Solution : { analysis, artemis }.
    //    Le privilège n'est consommé QUE si le chuchotement est réellement
    //    délivré (clamp 2 phrases). Repli : texte brut = analysis seule.──
    if (fusedArtemis) {
      const json = extractJsonObject(text);
      if (json && (json.analysis || json.artemis)) {
        const whisper = clampTwoSentences(String(json.artemis || '').trim());
        const analysis = String(json.analysis || '').trim();
        if (whisper) await consumePerk(guarded.email, 'artemis');
        return NextResponse.json({ analysis: analysis || text, artemis: whisper || null, found: true });
      }
      // JSON KO : la réponse brute reste une analyse valide, sans secret.
      return NextResponse.json({ analysis: text, artemis: null, found: true });
    }

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
      return NextResponse.json({ analysis: text, found: true, ...(artemisBlocked ? { artemisBlocked } : {}) });
    }
  } catch (err) {
    console.error('[astro-interpretation-obstacle]', err);
    return NextResponse.json(
      { interpretation: null, analysis: null, found: false },
      { status: 200 },
    );
  }
}
