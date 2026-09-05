"use server";

import { NextRequest, NextResponse } from 'next/server';
import { TAROT_CARDS } from '@/lib/tarot-data';
import { prisma } from '@/lib/prisma';
import { callOracle, extractJsonObject } from '@/lib/llm';

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
}

interface CardInfo {
  id: number;
  name: string;
  position?: string;
}

// Types reconnus
const VALID_TYPES = [
  'tarot-3-cartes',
  'tarot-5-cartes',
  'tarot-5-c-manuelle',
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

  const { type, cartes, question, userId, lang } = body;
  const language: 'fr' | 'en' = lang === 'en' ? 'en' : 'fr';

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

  // ── Gating des droits (quota base/avancé par compte) ──
  // Si l'utilisateur est connecté (userId = email), on vérifie ET consomme le
  // quota avant de générer l'interprétation. Invité (sans compte) → libre.
  if (userId && typeof userId === 'string' && userId.trim()) {
    const { canDo, consume } = await import('@/lib/entitlements');
    const decision = await canDo(userId, validType, question ?? null);
    if (!decision.allowed) {
      return NextResponse.json(
        { error: decision.message, reason: decision.reason, gated: true, status: 402 },
        { status: 402 }
      );
    }
    await consume(userId, validType, question ?? null);
  }

  const expectedCardCount = {
    'tarot-3-cartes': 3,
    'tarot-5-cartes': 5,
    'tarot-5-c-manuelle': 5,
    'yi-jing-simple': 0, // Yi Jing n'utilise pas de cartes sélectionnées
    'yi-jing-question': 0
  };

  if (cartes && (!Array.isArray(cartes) || cartes.length !== expectedCardCount[validType])) {
    return NextResponse.json(
      { error: `Pour ${validType}, attends ${expectedCardCount[validType]} carte(s)` },
      { status: 400 }
    );
  }

  // --- Atelier de prompt ---
  let prompt = '';
  const isTarot = type.startsWith('tarot');

  if (isTarot) {
    const cardNames = cartes.map((id: number) => {
      const c = TAROT_CARDS.find(cc => cc.id === id);
      if (!c) return `Carte ${id}`;
      return language === 'en' ? (c.nameEn || c.name) : c.name;
    });
    const positionsFr = type === 'tarot-5-c-manuelle'
      ? ['Sommet (Situation)', 'Orient (Forces)', 'Synthèse (Issue)', 'Occident (Défis)', 'Base (Soutien)']
      : ['Présent', 'Passé', 'Avenir'];
    const positionsEn = type === 'tarot-5-c-manuelle'
      ? ['Top (Situation)', 'East (Strengths)', 'Synthesis (Outcome)', 'West (Challenges)', 'Base (Support)']
      : ['Present', 'Past', 'Future'];
    const positions = language === 'en' ? positionsEn : positionsFr;

    prompt = `Tu es un voyant, un tireur de bonne aventure d'une profonde bonté, qui reçoit cette personne comme un être cher venu chercher du réconfort et des réponses. Tu te mets à son service, corps et âme, avec toute la chaleur humaine, la présence et l'empathie d'un véritable mentor qui l'écoute vraiment.
L'utilisateur a posé la question : "${question || 'Aide-moi à comprendre mon chemin'}"
Cartes tirées, analysées strictement selon leur axe temporel (1 = Présent, 2 = Passé, 3 = Avenir) :
${cartes.map((id: number, i: number) => `${i+1}. ${cardNames[i]} — ${positions[i]}`).join('\n')}
Consigne d'âme :
- Place-toi tout entier dans la peau de cette personne. Ressens ce qu'elle ressent, ses doutes, ses blessures silencieuses et ses espoirs. Parle-lui comme on parle à quelqu'un qu'on aime : avec le "tu", la tendresse, la vérité douce et la proximité d'un être humain, jamais comme une machine.
- Sois pleinement humain et chaleureux : rassure, accompagne, touche le cœur. Évite tout ton froid ou académique.
- À l'échelle MICROSCOPIQUE : pour chaque période (Présent, Passé, Avenir), décris précisément et avec délicatesse ce que la carte représente pour elle/lui, étape par étape, comme si tu lui prenais la main pour le lui montrer.
- À l'échelle MACROSCOPIQUE : dans "resume", offre une synthèse globale et bienveillante de ce que ce tirage signifie pour sa vie tout entière, au-delà des périodes — un message de lumière qu'elle/il pourra garder.
Interprétation (réponds UNIQUEMENT avec un JSON valide comme suit) :
{
"passe": "<OBLIGATOIREMENT entre 550 et 750 caractères, sinon ta réponse est incomplète : ce que la carte du Passé révèle pour elle/lui, avec délicatesse et empathie. Explore les racines, les souvenirs, les conditionnements encore présents, les leçons de l'ombre et de la lumière.>",
"present": "<OBLIGATOIREMENT entre 550 et 750 caractères, sinon ta réponse est incomplète : ce que la carte du Présent éclaire dans son vécu immédiat. Décris ses émotions, ses relations, ses blocages et ses forces, comme si tu lui tenais la main dans le moment présent.>",
"avenir": "<OBLIGATOIREMENT entre 550 et 750 caractères, sinon ta réponse est incomplète : ce que la carte de l'Avenir lui annonce, comme une promesse de lumière. Esquisse le cheminement, les ouvertures possibles, les évolutions douces et les invitations de demain.>",
"resume": "<OBLIGATOIREMENT entre 350 et 500 caractères, sinon ta réponse est incomplète : synthèse globale et conclusion bienveillante du tirage, un message de lumière qu'elle/il pourra garder et relire.>"
}${language === 'en' ? '\nIMPORTANT: Write everything in English.' : ''}`;
  } else {
    // Yi Jing
    prompt = `Tu es un Maître du Yi Jing. Réponds à la question suivante :
Question : "${question || 'Montre-moi la voie'}"

Structure ta réponse sous forme de poème inspiré avec ces sections UNIQUEMENT en JSON :
{
"situation": "<sensation générale de l'hexagramme, 3-4 phrases>",
"defis": "<les tensions à gérer, 2-3 phrases>",
"soutien": "<où trouver l'appui, 2-3 phrases>",
"issue": "<perspectives d'évolution, 3-4 phrases>",
"conseil": "<message décisif, 1-2 phrases>",
"resume": "<2-3 phrases : synthèse globale et conclusion de l'hexagramme>"
}${language === 'en' ? '\nIMPORTANT: Write everything in English.' : ''}`;
  }

  // --- Appels API en cascade ---
  const openRouterModels = [
    'openai/gpt-oss-120b:free',
    'meta-llama/llama-3-8b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
    'google/gemma-2-9b-it:free',
    'qwen/qwen-2-7b-instruct:free'
  ];

  const content = (await callOracle(prompt)) || '';

  // Parse JSON de la réponse
  let parsed: Interpretation = {};
  parsed = extractJsonObject(content);
  // Offline fallback si rien ne fonctionne — on valide les BONS champs selon
  // le type : tarot = passe/present/avenir/resume, yi-jing = les 5 sections.
  const isComplete = isTarot
    ? !!(parsed.passe && parsed.present && parsed.avenir && parsed.resume)
    : !!(parsed.situation && parsed.defis && parsed.soutien && parsed.issue && parsed.conseil);
  if (!isComplete) {
    console.log('[interpret] Falling back to offline generator.');
    parsed = isTarot
      ? generateTarotInterpretation(cartes.map((id: number) => ({ id, name: TAROT_CARDS.find(c => c.id === id)?.name || '' })), question)
      : generateYijingInterpretation(question, language);
  }

  // Sauvegarde DB
  let savedReadingId: string | null = null;
  if (userId) {
    try {
      const user = await prisma.user.findUnique({ where: { email: userId } });
      if (user) {
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
    } catch (dbError) {
      console.error('[interpret] Database save error:', dbError);
    }
  }

  return NextResponse.json({ ...parsed, readingId: savedReadingId });
}