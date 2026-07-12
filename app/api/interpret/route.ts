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
      situation: `
Votre passé a été marqué par ${pas.name} (${pas.keywords.join(', ')}), 
façonnant vos défis actuels. Aujourd'hui, ${present.name} vous invite à 
reconsidérer vos priorités (${present.keywords.join(', ')}).
`,
      defis: `
Les blocages que vous ressentez viennent de l'énergie de ${pas.name},
toujours active inconsciemment. ${present.name} vous appelle à trancher net.`,
      soutien: `
La transition vers ${avenir.name} (${avenir.keywords.join(', ')}) est inévitable.
Même si elle semble lointaine, elle travaille déjà pour vous.`,
      issue: `
L'avenir vous révèle ${avenir.name} : une vibration de ${avenir.keywords.join(', ')}.
Votre chemin est tracé.`,
      conseil: "Trois cartes, trois étapes. Avancez pas à pas."
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

function generateYijingInterpretation(question?: string): Interpretation {
  const seed = question ? question.length : Math.floor(Math.random() * 1000);

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
      : ['Passé', 'Présent', 'Futur'];
    const positionsEn = type === 'tarot-5-c-manuelle'
      ? ['Top (Situation)', 'East (Strengths)', 'Synthesis (Outcome)', 'West (Challenges)', 'Base (Support)']
      : ['Past', 'Present', 'Future'];
    const positions = language === 'en' ? positionsEn : positionsFr;

    prompt = `Tu es un oracle expert du Tarot de Marseille.
L'utilisateur a posé la question : "${question || 'Aide-moi à comprendre mon chemin'}"
Cartes tirées (${positions.join(', ')}) :
${cartes.map((id: number, i: number) => `${i+1}. ${cardNames[i]} — ${positions[i]}`).join('\n')}
Interprétation (réponds UNIQUEMENT avec un JSON valide comme suit) :
{
"situation": "<3-4 phrases : analyse combinée de la situation>",
"defis": "<3-4 phrases : obstacles révélés>",
"soutien": "<3-4 phrases : forces d'ancrage>",
"issue": "<3-4 phrases : évolution probable>",
"conseil": "<2-3 phrases : message clair et puissant>",
"resume": "<2-3 phrases : synthèse globale et conclusion du tirage>"
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
  // Offline fallback si rien ne fonctionne
  if (!parsed.situation || !parsed.defis || !parsed.soutien || !parsed.issue || !parsed.conseil) {
    console.log('[interpret] Falling back to offline generator.');
    parsed = isTarot
      ? generateTarotInterpretation(cartes.map((id: number) => ({ id, name: TAROT_CARDS.find(c => c.id === id)?.name || '' })), question)
      : generateYijingInterpretation(question);
  }

  // Sauvegarde DB
  if (userId) {
    try {
      const user = await prisma.user.findUnique({ where: { email: userId } });
      if (user) {
        await prisma.reading.create({
          data: {
            userId: user.id,
            type: type,
            question: question || null,
            cards: JSON.stringify(cartes || []),
            interpretation: JSON.stringify(parsed)
          }
        });
      }
    } catch (dbError) {
      console.error('[interpret] Database save error:', dbError);
    }
  }

  return NextResponse.json(parsed);
}