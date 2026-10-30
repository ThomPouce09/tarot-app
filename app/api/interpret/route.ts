"use server";

import { NextRequest, NextResponse } from 'next/server';
import { buildProfileBlock, injectProfile } from '@/lib/profile';
import { TAROT_CARDS } from '@/lib/tarot-data';
import { tarotNameI18n, POSITION_LABELS_3 } from '@/lib/tarot-data-i18n';
import { prisma } from '@/lib/prisma';
import { callOracle, extractJsonObject } from '@/lib/llm';
import { calcAge } from '@/lib/dates';
import { resolveLang, outputDirective, type LlmLang } from '@/lib/lang';
import { isGuestMode } from '@/lib/guest';
import { isBaseType } from '@/lib/classification';
import { tarotLore, yiJingLore, LORE_INSTRUCTION, type LoreFact } from '@/lib/reading-lore';

interface Interpretation {
  situation?: string;
  defis?: string;
  soutien?: string;
  issue?: string;
  conseil?: string;
  passe?: string;
  present?: string;
  avenir?: string;
  resume?: string;
  /** Lame de précision : DÉVELOPPEMENT (réponse à la question posée). */
  develop?: string;
  /** Lame de précision : CONCLUSION franche. */
  conclusion?: string;
}

interface CardInfo {
  id: number;
  name: string;
  position?: string;
}

// Types reconnus
const VALID_TYPES = [
  'tarot-3-cartes',
  'tarot-3-cartes-simplifie',
  'tarot-5-cartes',
  'tarot-5-c-manuelle',
  'yi-jing-simplifie',
  'yi-jing-simple',
  'yi-jing-question'
] as const;

type InterpretationType = typeof VALID_TYPES[number];

/*
┌───────────────────────────────────────────────────────┐
│         Générateurs offline intelligents              │
└───────────────────────────────────────────────────────┘
*/

function generateTarotInterpretation(cards: CardInfo[], question?: string): Interpretation {
  // Récupérer tous les détails des cartes
  const getCardDetails = (id: number): { name: string; keywords: string[] } => {
    const card = TAROT_CARDS.find((c) => c.id === id);
    return {
      name: card?.name || `Carte ${id}`,
      keywords: card?.keywords || ['mystère', 'destin']
    };
  };

  const cardData = cards.map(card => getCardDetails(card.id));

  // Sélectionner un template basé sur la somme des IDs (pour pseudo-aléatoire)
  const seed = cards.reduce((acc, val) => acc + val.id, 0);

  // --- Tarot 5 cartes ---
  if (cards.length === 5) {
    const [sommet, orient, synthese, occident, base] = cardData;

    const templates = {
      situation: [
        `Le tirage s'ouvre avec ${sommet.name} au sommet de votre ciel, symbolisant une phase marquée par ${sommet.keywords.join(', ')}. À l'Orient, ${orient.name} révèle vos forces actuelles. C'est un appel à écouter ces énergies pour éclairer votre situation.`,
        `Actuellement, ${sommet.name} domine la scène, apportant des thèmes de ${sommet.keywords.join(', ')}. ${orient.name} à vos côtés suggère que vous êtes soutenu par des forces invisibles.`
      ],
      defis: [
        `Votre défi principal s'incarne en ${occident.name}, qui pointe les ombres liées à ${occident.keywords.join(', ')}. Transmutez cette énergie en force constructive.`,
        `La carte ${occident.name} à l'Occident signale des obstacles internes (${occident.keywords.join(', ')}). Affrontez-les sans fuir.`
      ],
      soutien: [
        `Vous pouvez compter sur ${base.name} à la base de votre tirage. Elle vous offre un ancrage solide centré sur ${base.keywords.join(', ')}.`,
        `La présence de ${base.name} rappelle que vos fondations (${base.keywords.join(', ')}) sont inébranlables. Puisez-y.`
      ],
      issue: [
        `L'issue est guidée par ${synthese.name}, annonçant une résolution axée sur ${synthese.keywords.join(', ')}. Faites confiance.`,
        `La synthèse ${synthese.name} indique que vos efforts actuels convergent vers un accomplissement centré sur ${synthese.keywords.join(', ')}.`
      ],
      conseil: [
        "Laissez les cartes vous parler sans précipitation. Notez vos ressentis.",
        "Cultivez la patience : chaque carte révèle une facette de votre parcours."
      ]
    };

    return {
      situation: templates.situation[seed % templates.situation.length],
      defis: templates.defis[(seed + 1) % templates.defis.length],
      soutien: templates.soutien[(seed + 2) % templates.soutien.length],
      issue: templates.issue[(seed + 3) % templates.issue.length],
      conseil: templates.conseil[(seed + 4) % templates.conseil.length]
    };
  }

  // --- Tarot 3 cartes ---
  if (cards.length === 3) {
    const [pas, present, avenir] = cardData;

    return {
      passe: `Votre passé a été marqué par ${pas.name} (${pas.keywords.join(', ')}), façonnant qui vous êtes aujourd'hui. Cette racine vit encore en vous, avec douceur et patience.`,
      present: `Aujourd'hui, ${present.name} vous entoure de son énergie (${present.keywords.join(', ')}). C'est le moment présent qui vous invite à écouter votre cœur et à avancer.`,
      avenir: `La transition vers ${avenir.name} (${avenir.keywords.join(', ')}) est en marche. Même lointaine, elle travaille déjà pour vous et vous porte vers la lumière.`,
      resume: `Vos trois cartes tracent un chemin de tendresse : du passé qui vous a façonné, au présent qui vous habite, jusqu'à l'avenir qui vous attend. Avancez pas à pas, en confiance.`
    };
  }

  // Fallback générique
  return {
    situation: `Le tirage révèle ${cardData.map(c => `${c.name} (${c.keywords.join(', ')})`).join(', ')}.`,
    defis: "Observez les défis indiqués par ces cartes avec bienveillance.",
    soutien: "Vos ressources intérieures sont plus fortes que les apparences ne le laissent penser.",
    issue: "L'issue dépendra de la façon dont vous intégrerez ces messages aujourd'hui.",
    conseil: "Ecoutez votre intuition plus que les interprétations toutes faites."
  };
}

/** Fallback offline de la LAME DE PRÉCISION : develop / conclusion / resume. */
function generateClarifyFallback(id: number | null, name: string, lang: LlmLang, question: string): Interpretation {
  const card = TAROT_CARDS.find((c) => c.id === id);
  const kw = (card?.keywords || ['mystère', 'destin']);
  const nm = name || card?.name || `Carte ${id}`;
  if (lang === 'en') {
    return {
      develop: `The clarifier that fell for your question — "${question || 'your follow-up'}" — is ${nm}, carrying ${kw.slice(0, 3).join(', ')}. Read against what the spread already showed, this card answers you directly: the energy it holds names exactly the point you asked about. Take its ${kw[0]} as the thread to pull; the rest will follow.`,
      conclusion: `Hold on to ${kw[0]}; release what resists it. The card is clear — act in that direction, without waiting for more proof.`,
      resume: `${nm} answers your question in one gesture: ${kw[1] || kw[0]} is yours to trust.`,
    };
  }
  return {
    develop: `La lame de précision tombée pour votre question — « ${question || 'votre relance'} » — est ${nm}, porteuse de ${kw.slice(0, 3).join(', ')}. Lue en regard du tapis déjà posé, cette carte vous répond sans détour : l'énergie qu'elle tient nomme précisément le point que vous interrogez. Prenez son fil de ${kw[0]} — la suite se déroulera.`,
    conclusion: `Tenez ${kw[0]} ; lâchez ce qui s'y oppose. La carte est claire : agissez dans cette direction, sans attendre davantage de preuves.`,
    resume: `${nm} répond à votre question en un seul geste : ${kw[1] || kw[0]} vous appartient, faites-lui confiance.`,
  };
}

function generateYijingInterpretation(question?: string, lang: 'fr' | 'en' = 'fr'): Interpretation {
  const seed = question ? question.length : Math.floor(Math.random() * 1000);

  if (lang === 'en') {
    const situation = [
      "Changes are coming, invisible yet powerful. Your situation reflects a natural transition.",
      "A powerful current runs through your life. Things evolve quickly, even if imperceptibly."
    ];
    const conseil = [
      "Stay attentive to subtle signs: they announce a metamorphosis.",
      "Let events ripen without haste. The moment will come."
    ];
    return {
      situation: situation[seed % situation.length] + (question ? ` Your question: "${question}"` : ''),
      defis: "The I Ching points to useless resistances. Let go.",
      soutien: "The natural flow of life is there to guide you, as it always has.",
      issue: "The hexagrams show current tensions will untie spontaneously.",
      conseil: conseil[(seed * 2) % conseil.length],
      resume: "The hexagram invites you to welcome the natural movement of things: act within the flow rather than against it, and the path will clarify itself."
    };
  }

  const situation = [
    "Les changements s'annoncent, invisibles mais puissants. Votre situation reflète une transition naturelle.",
    "Un courant puissant traverse votre vie. Les choses évoluent rapidement, même si c'est imperceptible."
  ];

  const conseil = [
    "Restez attentif aux signes subtils : ils annoncent une métamorphose.",
    "Laissez mûrir les événements sans précipitation. Le moment viendra."
  ];

  return {
    situation: situation[seed % situation.length] + (question ? ` Votre question : "${question}"` : ''),
    defis: "Le Yi Jing souligne les résistances inutiles. Lachez prise.",
    soutien: "Le flux naturel de la vie est là pour vous guider, comme il l'a toujours fait.",
    issue: "Les hexagrammes montrent que les tensions actuelles se dénoueront spontanément.",
    conseil: conseil[(seed * 2) % conseil.length],
    resume: "L'hexagramme vous invite à accueillir le mouvement naturel des choses : agissez dans le flux plutôt que contre lui, et la voie se clarifiera d'elle-même."
  };
}

/*
┌───────────────────────────────────────────────────────┐
│                Logique d'interprétation                │
└───────────────────────────────────────────────────────┘
*/

export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
  } catch (e) {
    console.error('[interpret] Invalid JSON body:', e);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  console.log('[interpret] Received body:', JSON.stringify(body, null, 2));

  const { type, cartes, question, userId, lang, followUp, prevContext, parentReadingId, clarifyCard } = body;
  // ── Lame de précision (tarot avancé : « 3 Cartes · Précis » et « 5 Cartes
  //    Manuelles »). Chaque question enchaînée attire UNE carte neuve, tirée
  //    comme au premier tour et jamais retombée dans cette consultation. La
  //    réponse prend alors un format franc : DÉVELOPPEMENT puis CONCLUSION —
  //    plus les rubriques Passé/Présent/Avenir du tapis d'origine.
  const clarifyId = Number.isInteger(clarifyCard) ? (clarifyCard as number) : null;
  const isClarify = followUp === true && clarifyId !== null && type.startsWith('tarot');
  const language: LlmLang = resolveLang(lang);

  // Validation
  if (!type || typeof type !== 'string') {
    return NextResponse.json(
      { error: `type is required and must be a string. Received: ${typeof type}` },
      { status: 400 }
    );
  }

  const validType = type as InterpretationType;
  if (!VALID_TYPES.includes(validType)) {
    return NextResponse.json(
      { error: `type invalide : doit être l'un de ${VALID_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  // ── Gating serveur : SESSION (jeton X-Session, l'email du body est ignoré)
  //    + quota base/avancé + dédup par flowId. L'« invité libre » n'existe
  //    plus : toutes les pages de tirage sont derrière AuthGate. ──
  const { guardRequest } = await import('@/lib/quota-guard');
  const guarded = await guardRequest(request, { email: userId, type: validType, flowId: body.flowId, question }, validType);
  if ('error' in guarded) return guarded.error;

  const expectedCardCount = {
    'tarot-3-cartes': 3,
    'tarot-3-cartes-simplifie': 3,
    'tarot-5-cartes': 5,
    'tarot-5-c-manuelle': 5,
    'yi-jing-simplifie': 0, // Yi Jing n'utilise pas de cartes sélectionnées
    'yi-jing-simple': 0,
    'yi-jing-question': 0
  };

  if (cartes && (!Array.isArray(cartes) || cartes.length !== expectedCardCount[validType])) {
    return NextResponse.json(
      { error: `Pour ${validType}, attends ${expectedCardCount[validType]} carte(s)` },
      { status: 400 }
    );
  }
  if (isClarify) {
    const c = TAROT_CARDS.find((cc) => cc.id === clarifyId);
    if (!c) return NextResponse.json({ error: 'lame de précision inconnue' }, { status: 400 });
    // Cohérence du jeu : la lame neuve ne doit être NI une carte du tapis,
    // NI une lame de précision déjà tombée dans cette consultation (le client
    // renvoie l'historique des lames posées — vérification serveur, autorité).
    const laid = new Set<number>(Array.isArray(cartes) ? cartes : []);
    for (const x of Array.isArray(body.clarifyHistory) ? body.clarifyHistory : []) {
      if (Number.isInteger(x)) laid.add(x as number);
    }
    if (laid.has(clarifyId)) {
      return NextResponse.json({ error: 'cette lame est déjà posée dans la consultation' }, { status: 400 });
    }
  }

  // ── Contexte transmis à l'oracle : question, thème/sous-thème, profil ──
  // « 3 Cartes Simplifié » envoie « Arcane-guide — intention » : on sépare le
  // thème du sous-thème pour les nommer explicitement dans le prompt. Le
  // tirage « précis » envoie une question libre. Le profil (date de naissance,
  // âge, sexe) est injecté discrètement : l'IA l'exploite sans jamais le citer.
  const ctx: string[] = [];
  const q = (question || '').trim();
  const dIdx = q.indexOf(' — ');
  if (dIdx > 0) {
    const head = q.slice(0, dIdx);
    const sub = q.slice(dIdx + 3);
    ctx.push(language === 'en'
      ? `Chosen theme: "${head}". Sub-theme / intention: "${sub}".`
      : `Thème choisi : « ${head} ». Sous-thème / intention : « ${sub} ».`);
  } else if (q) {
    ctx.push(language === 'en'
      ? 'The consultant freely worded this personal question.'
      : 'Le consultant a formulé librement cette question personnelle.');
  }
  try {
    // MODE INVITÉ : ni date de naissance ni sexe dans le prompt.
    if (userId && typeof userId === 'string' && userId.trim() && !(await isGuestMode(userId))) {
      const prof = await prisma.user.findUnique({
        where: { email: userId },
        select: { dateOfBirth: true, gender: true },
      });
      const dob = prof?.dateOfBirth ? prof.dateOfBirth.toISOString().slice(0, 10) : null;
      if (dob) {
        const age = calcAge(dob);
        const g = (prof?.gender || '').toLowerCase();
        const gFr = g === 'female' ? ', femme' : g === 'male' ? ', homme' : '';
        const gEn = g === 'female' ? ', female' : g === 'male' ? ', male' : '';
        ctx.push(language === 'en'
          ? `Confidential profile: born on ${dob}${age !== null ? ` (${age} years old)` : ''}${gEn}. Use this only to tune the tone, stakes and examples — NEVER quote the birth date, age or sex explicitly.`
          : `Profil confidentiel : né le ${dob.split('-').reverse().join('/')}${age !== null ? ` (${age} ans)` : ''}${gFr}. Exploite-le uniquement pour accorder le ton, les enjeux et les exemples — ne cite JAMAIS la date de naissance, l'âge ou le sexe.`);
      }
    }
  } catch {}
  // ── Enchaînement de questions (voyance en consultation filée) ──
  // Le client renvoie le fil des échanges precedents (question + synthese deja
  // livree, tronquee) : l'oracle approfondit sans repasser en revue ce qui est
  // deja dit. Chaque nouvelle question est une consultation complete (debitee,
  // nouveau flowId cote client) — le prompt le rappelle a l'IA.
  const threadLine = (followUp === true && typeof prevContext === 'string' && prevContext.trim())
    ? (language === 'en'
        ? `\nConsultation thread so far (earlier questions and the FULL answers already given):\n${prevContext.slice(0, 7000)}\nCONSISTENCY REQUIRED: begin by weaving back 2-3 specific elements (images, names, dates, advice) from the previous answers, quoted naturally, so the consultant recognises being understood; then deepen without repeating whole paragraphs. This follow-up question is a FULL advanced reading: every section must be as long and argued as a first reading.\n`
        : `\nFil de la consultation (questions precedentes et réponses DÉJÀ livrées en intégralité) :\n${prevContext.slice(0, 7000)}\nCOHÉRENCE EXIGÉE : commence par tisser dans ta réponse 2 à 3 éléments précis des réponses précédentes (images, noms, conseils, dates) cités naturellement, pour que le consultant se reconnaisse compris ; puis approfondis SANS te répéter paragraphes entiers. Cette question est une consultation avancée COMPLÈTE : chaque section doit être aussi longue et argumentée qu'une première lecture.\n`)
    : '';
  const contextLine = (ctx.length || threadLine)
    ? (language === 'en' ? `\nContext: ${ctx.join(' ')} ${threadLine}\n` : `\nContexte : ${ctx.join(' ')} ${threadLine}\n`)
    : '';

  // ── Lore du devin (tirages AVANCES uniquement, note calculee en dur) ──
  // Etape = nb de questions deja filees (0 = tirage initial). Graine stable
  // (compte + tire + question) : la meme consultation rejoue la meme note.
  const threadCount = typeof prevContext === 'string'
    ? (prevContext.match(/\d+\) Question/g) || []).length
    : 0;
  const loreStep = followUp === true ? Math.max(1, threadCount - 1) : 0;
  const loreSeed = `${userId || ''}|${validType}|${JSON.stringify(cartes || body.baguette || '')}|${q}`;

  /** Fact technique choisi (ou null), formate en consigne pour le prompt. */
  const loreLine = (fact: LoreFact | null): string => {
    if (!fact) return '';
    return (language === 'en'
      ? `\nNote of the diviner — FACT computed from the actual draw (${fact.key}, not negotiable): ${fact.text} ${LORE_INSTRUCTION}\n`
      : `\nNote du devin — fait CALCULE sur le tirage reel (${fact.key}, non negociable) : ${fact.text} ${LORE_INSTRUCTION}\n`);
  };

  // --- Atelier de prompt ---
  let prompt = '';
  const isTarot = type.startsWith('tarot');
  // Positions des cartes (libelles de place, par type et par langue) — utilise
  // par la lecture complete ET par la lame de precision (decrire le tapis).
  const positionsByLang: Record<LlmLang, string[]> = type === 'tarot-5-c-manuelle'
    ? {
        fr: ['Sommet (Situation)', 'Orient (Forces)', 'Synthèse (Issue)', 'Occident (Défis)', 'Base (Soutien)'],
        en: ['Top (Situation)', 'East (Strengths)', 'Synthesis (Outcome)', 'West (Challenges)', 'Base (Support)'],
        es: ['Cima (Situación)', 'Oriente (Fortalezas)', 'Síntesis (Resultado)', 'Occidente (Desafíos)', 'Base (Apoyo)'],
        hi: ['शीर्ष (स्थिति)', 'पूर्व (शक्तियाँ)', 'संक्षेप (परिणाम)', 'पश्चिम (चुनौतियाँ)', 'आधार (सहायता)'],
      }
    : {
        fr: POSITION_LABELS_3.fr,
        en: POSITION_LABELS_3.en,
        es: POSITION_LABELS_3.es,
        hi: POSITION_LABELS_3.hi,
      };
  const positions = positionsByLang[language];

  if (isClarify) {
    // ── LA LAME DE PRÉCISION ── format franc : DÉVELOPPEMENT puis CONCLUSION.
    const cc = TAROT_CARDS.find((x) => x.id === clarifyId);
    const clarifyName = cc ? tarotNameI18n(cc.id, cc.name, language, cc.nameEn) : `Carte ${clarifyId}`;
    const spreadDesc = Array.isArray(cartes) && cartes.length > 0
      ? cartes.map((id: number, i: number) => {
          const c = TAROT_CARDS.find((x) => x.id === id);
          return `- ${c ? tarotNameI18n(c.id, c.name, language, c.nameEn) : `Carte ${id}`} (${positions[i] ?? ''})`;
        }).join('\n')
      : '-';
    let loreC = '';
    if (!isBaseType(validType)) {
      // Faits calculés sur le TAPIS COMPLET (cartes d'origine + lame neuve) :
      // dignités élémentaires et numérologie intègrent la précision.
      const spreadFr = type === 'tarot-5-c-manuelle'
        ? ['Sommet (Situation)', 'Orient (Forces)', 'Synthèse (Issue)', 'Occident (Défis)', 'Base (Soutien)']
        : (POSITION_LABELS_3.fr as unknown as string[]);
      const fullIds = [...(Array.isArray(cartes) ? cartes : []), clarifyId];
      loreC = loreLine(tarotLore({ cards: fullIds, positionsFr: [...spreadFr.slice(0, fullIds.length - 1), 'Lame de précision'], step: loreStep, seed: loreSeed }));
    }
    prompt = (language === 'en'
      ? `You are a kind, experienced fortune-teller in a follow-up consultation. The querier already received a full first reading, and now asks a sharper question. In professional practice, this question draws ONE clarifier card — a NEW card that never fell in this consultation. Read this single new card for THIS question, honestly and directly.
The querier's new question: "${q}"${contextLine}${loreC}
Cards already laid on the cloth (context of this consultation — do NOT re-read them):
${spreadDesc}
NEW clarifier card drawn for this question: ${clarifyName}
How to answer (frank guidance, NOT the past/present/future grid):
- "develop": 700–950 characters. What this new card says about the exact question asked, woven into what the original spread already revealed (recall 2-3 concrete elements from your earlier answers, quoted naturally). One coherent movement of thought — concrete, warm, using "you".
- "conclusion": 320–500 characters. A frank, direct conclusion: what to hold on to, what to let go of, what to do. No hedging, no vague consolation.
- "resume": 240–360 characters. One luminous line the querier can keep — the very essence of the card's answer, a phrase you could say out loud as the cards are being put back in their case.
${outputDirective(language)}
Answer ONLY with valid JSON:
{"develop": "...", "conclusion": "...", "resume": "..."}`
      : `Tu es un voyant, tireur de bonne aventure d'une profonde bonté, en pleine consultation suivie. Le consultant a déjà reçu une lecture complète, puis il pose une question plus précise. Dans la pratique du métier, cette question attire UNE carte de précision — une carte NEUVE, jamais tombée dans cette consultation. Tu lis cette carte unique pour la question posée, avec franchise et droiture.
La nouvelle question du consultant : "${q}"${contextLine}${loreC}
Cartes déjà posées sur le tapis (contexte de la consultation — tu ne les relis PAS) :
${spreadDesc}
NOUVELLE lame de précision tombée pour cette question : ${clarifyName}
Comment répondre (direction franche, PAS la grille passé/présent/avenir) :
- "develop" : 700 à 950 caractères. Ce que cette carte neuve dit, exactement, de la question posée, en la nouant à ce que le tapis d'origine a déjà révélé (rappelle 2 ou 3 éléments précis de tes réponses précédentes, cités naturellement). Un seul mouvement de pensée, concret, chaleureux, tutoiement compris.
- "conclusion" : 320 à 500 caractères. La conclusion franche et directe : ce qu'il faut tenir, ce qu'il faut lâcher, ce qu'il faut faire. Sans esquive, sans consolation vague.
- "resume" : 240 à 360 caractères. Une ligne lumineuse que le consultant peut emporter — l'essence de la réponse de la carte, une phrase qu'on dirait à voix haute en rangeant le jeu.
${outputDirective(language)}
Réponds UNIQUEMENT avec un JSON valide :
{"develop": "...", "conclusion": "...", "resume": "..."}`);
  } else if (isTarot) {
    const cardNames = cartes.map((id: number) => {
      const c = TAROT_CARDS.find(cc => cc.id === id);
      if (!c) return `Carte ${id}`;
      // 4 langues : fr direct, en via nameEn, es/hi via les tables générées.
      return tarotNameI18n(c.id, c.name, language, c.nameEn);
    });
    let lore = '';
    if (!isBaseType(validType)) {
      lore = loreLine(tarotLore({ cards: cartes, positionsFr: positions as unknown as string[], step: loreStep, seed: loreSeed }));
    }
    prompt = `Tu es un voyant, un tireur de bonne aventure d'une profonde bonté, qui reçoit cette personne comme un être cher venu chercher du réconfort et des réponses. Tu te mets à son service, corps et âme, avec toute la chaleur humaine, la présence et l'empathie d'un véritable mentor qui l'écoute vraiment.
L'utilisateur a posé la question : "${question || 'Aide-moi à comprendre mon chemin'}"${contextLine}${lore}
Cartes tirées, analysées strictement selon leur axe temporel (1 = Passé, 2 = Présent, 3 = Avenir) :
${cartes.map((id: number, i: number) => `${i+1}. ${cardNames[i]} — ${positions[i]}`).join('\n')}
Consigne d'âme :
- Place-toi tout entier dans la peau de cette personne. Ressens ce qu'elle ressent, ses doutes, ses blessures silencieuses et ses espoirs. Parle-lui comme on parle à quelqu'un qu'on aime : avec le "tu", la tendresse, la vérité douce et la proximité d'un être humain, jamais comme une machine.
- Sois pleinement humain et chaleureux : rassure, accompagne, touche le cœur. Évite tout ton froid ou académique.
- À l'échelle MICROSCOPIQUE : pour chaque période (Passé, Présent, Avenir), décris précisément et avec délicatesse ce que la carte représente pour elle/lui, étape par étape, comme si tu lui prenais la main pour le lui montrer.
- À l'échelle MACROSCOPIQUE : dans "resume", offre une synthèse globale et bienveillante de ce que ce tirage signifie pour sa vie tout entière, au-delà des périodes — un message de lumière qu'elle/il pourra garder.
Interprétation (réponds UNIQUEMENT avec un JSON valide comme suit) :
{
"passe": "<OBLIGATOIREMENT entre 550 et 750 caractères, sinon ta réponse est incomplète : ce que la carte du Passé révèle pour elle/lui, avec délicatesse et empathie. Explore les racines, les souvenirs, les conditionnements encore présents, les leçons de l'ombre et de la lumière.>",
"present": "<OBLIGATOIREMENT entre 550 et 750 caractères, sinon ta réponse est incomplète : ce que la carte du Présent éclaire dans son vécu immédiat. Décris ses émotions, ses relations, ses blocages et ses forces, comme si tu lui tenais la main dans le moment présent.>",
"avenir": "<OBLIGATOIREMENT entre 550 et 750 caractères, sinon ta réponse est incomplète : ce que la carte de l'Avenir lui annonce, comme une promesse de lumière. Esquisse le cheminement, les ouvertures possibles, les évolutions douces et les invitations de demain.>",
"resume": "<OBLIGATOIREMENT entre 350 et 500 caractères, sinon ta réponse est incomplète : synthèse globale et conclusion bienveillante du tirage, un message de lumière qu'elle/il pourra garder et relire.>"
}${outputDirective(language)}`;
  } else {
    // Yi Jing — note du devin : hexagramme reel tird (baguette), uniquement pour
    // les tirages avances ; le nom du nucleaire est lu en base pour etre exact.
    let lore = '';
    const hexNum = parseInt(String(body.baguette ?? ''), 10);
    if (!isBaseType(validType) && Number.isFinite(hexNum) && hexNum >= 1 && hexNum <= 64) {
      const { nuclearNumero } = await import('@/lib/reading-lore');
      const nuc = nuclearNumero(hexNum);
      const names = new Map<number, string>();
      try {
        const rows = await prisma.hexagram.findMany({ where: { numero: { in: nuc ? [hexNum, nuc] : [hexNum] } }, select: { numero: true, element: true } });
        rows.forEach((r: { numero: number; element: string }) => names.set(r.numero, r.element));
      } catch { /* silences the note, not the reading */ }
      lore = loreLine(yiJingLore({ numero: hexNum, nameOf: (n) => names.get(n) || null, step: loreStep, seed: loreSeed }));
    }
    prompt = `Tu es un Maître du Yi Jing. Réponds à la question suivante :
Question : "${question || 'Montre-moi la voie'}"${contextLine}${lore}

Structure ta réponse sous forme de poème inspiré avec ces sections UNIQUEMENT en JSON :
{
"situation": "<sensation générale de l'hexagramme, 3-4 phrases>",
"defis": "<les tensions à gérer, 2-3 phrases>",
"soutien": "<où trouver l'appui, 2-3 phrases>",
"issue": "<perspectives d'évolution, 3-4 phrases>",
"conseil": "<message décisif, 1-2 phrases>",
"resume": "<2-3 phrases : synthèse globale et conclusion de l'hexagramme>"
}${outputDirective(language)}`;
  }

  // --- Appels API en cascade ---
  const openRouterModels = [
    'openai/gpt-oss-120b:free',
    'meta-llama/llama-3-8b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
    'google/gemma-2-9b-it:free',
    'qwen/qwen-2-7b-instruct:free'
  ];

  // ── Profil oracle (optionnel) : « le consultant en quelques mots ». ──
  prompt = injectProfile(prompt, await buildProfileBlock(guarded.email));
  const content = (await callOracle(prompt)) || '';

  // Parse JSON de la réponse
  let parsed: Interpretation = {};
  parsed = extractJsonObject(content);
  // Offline fallback si rien ne fonctionne — on valide les BONS champs selon
  // le type : tarot = passe/present/avenir/resume, yi-jing = les 5 sections.
  const isComplete = isClarify
    ? !!(parsed.develop && parsed.conclusion && parsed.resume)
    : isTarot
      ? !!(parsed.passe && parsed.present && parsed.avenir && parsed.resume)
      : !!(parsed.situation && parsed.defis && parsed.soutien && parsed.issue && parsed.conseil);
  if (!isComplete) {
    console.log('[interpret] Falling back to offline generator.');
    parsed = isClarify
      ? generateClarifyFallback(clarifyId, TAROT_CARDS.find(c => c.id === clarifyId)?.name || '', language, q)
      : isTarot
        ? generateTarotInterpretation(cartes.map((id: number) => ({ id, name: TAROT_CARDS.find(c => c.id === id)?.name || '' })), question)
        : generateYijingInterpretation(question, language === 'en' ? 'en' : 'fr');
  }

  // Sauvegarde DB (jamais pour un tirage prêté : pas d'historique hôte)
  let savedReadingId: string | null = null;
  if (userId && !(await isGuestMode(String(userId)))) {
    try {
      const user = await prisma.user.findUnique({ where: { email: userId } });
      if (user) {
        // Enchaînement : la réponse s'range dans le fil du tirage initial
        // (clé `thread` ajoutee au JSON stocke) — Mes tirages montre alors
        // TOUTES les etapes de la consultation dans la fiche d'origine.
        if (followUp === true && typeof parentReadingId === 'string' && parentReadingId) {
          const parent = await prisma.reading.findFirst({
            where: { id: parentReadingId, userId: user.id, guest: false },
          });
          if (parent) {
            let st: Record<string, any> = {};
            try { st = JSON.parse(parent.interpretation || '{}'); } catch { st = {}; }
            const steps: any[] = Array.isArray(st.thread) ? st.thread : [];
            const step: Record<string, any> = { question: question || '' };
            // La lame de precision est stockee dans le fil : Mes tirages peut la
            // rejouer sous le tapis, a sa place, avec sa reponse propre.
            if (isClarify && clarifyId !== null) step.clarifyCard = clarifyId;
            const ansKeys = isClarify
              ? ['develop', 'conclusion', 'resume']
              : isTarot
                ? ['passe', 'present', 'avenir', 'resume']
                : ['situation', 'defis', 'soutien', 'issue', 'conseil', 'resume'];
            const pj = parsed as Record<string, unknown>;
            for (const k of ansKeys) if (typeof pj[k] === 'string' && pj[k]) step[k] = pj[k];
            // Les cles de base (reponse #1) restent a la racine : les vues
            // existantes les lisent telles quelles ; le fil s'ajoute derriere.
            st = { ...st, thread: [...steps, step] };
            await prisma.reading.update({
              where: { id: parent.id },
              data: { interpretation: JSON.stringify(st) },
            });
            savedReadingId = parent.id;
          }
        }
        if (!savedReadingId) {
          const created = await prisma.reading.create({
            data: {
              userId: user.id,
              type: type,
              question: question || null,
              cards: JSON.stringify(cartes || []),
              interpretation: JSON.stringify(parsed)
            }
          });
          savedReadingId = created.id;
        }
      }
    } catch (dbError) {
      console.error('[interpret] Database save error:', dbError);
    }
  }

  return NextResponse.json({ ...parsed, readingId: savedReadingId });
}