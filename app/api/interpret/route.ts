"use server";

import { NextRequest, NextResponse } from 'next/server';
import { TAROT_CARDS } from '@/lib/tarot-data';
import { prisma } from '@/lib/prisma';

interface Interpretation {
  situation?: string;
  defis?: string;
  soutien?: string;
  issue?: string;
  conseil?: string;
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
    conseil: conseil[(seed * 2) % conseil.length]
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

  const { type, cartes, question, userId } = body;

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
    const cardNames = cartes.map((id: number) => TAROT_CARDS.find(c => c.id === id)?.name || `Carte ${id}`);
    const positions = type === 'tarot-5-c-manuelle'
      ? ['Sommet (Situation)', 'Orient (Forces)', 'Synthèse (Issue)', 'Occident (Défis)', 'Base (Soutien)']
      : ['Passé', 'Présent', 'Futur'];

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
"conseil": "<2-3 phrases : message clair et puissant>"
}`;
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
"conseil": "<message décisif, 1-2 phrases>"
}`;
  }

  // --- Appels API en cascade ---
  const openRouterModels = [
    'openai/gpt-oss-120b:free',
    'meta-llama/llama-3-8b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
    'google/gemma-2-9b-it:free',
    'qwen/qwen-2-7b-instruct:free'
  ];

  let response: Response | null = null;
  let successfulModel: string | null = null;
  const apiKey = process.env.OPENROUTER_API_KEY;

  // OpenRouter candidats
  for (const model of openRouterModels) {
    try {
      console.log(`[interpret] Trying OpenRouter model: ${model}`);
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: isTarot
              ? "Tu es un oracle expert du Tarot de Marseille. Réponds UNIQUEMENT avec un JSON valide."
              : "Tu es un Maître du Yi Jing. Réponds UNIQUEMENT avec un JSON poétique et valide." },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1200,
          temperature: 0.72,
        })
      });

      if (res.ok) {
        response = res;
        successfulModel = model;
        break;
      }
    } catch (err) {
      console.error(`[interpret] OpenRouter ${model} error:`, err);
    }
  }

  // FreeLLM fallback
  if (!response) {
    try {
      console.log('[interpret] All OpenRouter models failed. Trying FreeLLM fallback...');
      const res = await fetch('http://localhost:3001/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.FREELLM_API_KEY || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'auto',
          messages: [
            { role: 'system', content: isTarot
              ? "Tu es un oracle expert Tarot. JSON valide UNIQUEMENT."
              : "Tu es un Maître Yi Jing. JSON valide poétique UNIQUEMENT." },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1200,
          temperature: 0.72,
        })
      });

      if (res.ok) {
        response = res;
        successfulModel = 'freellm:auto';
      }
    } catch (err) {
      console.error('[interpret] FreeLLM fallback failed:', err);
    }
  }

  // Parse JSON de la réponse
  let parsed: Interpretation = {};
  if (response) {
    try {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.message?.content || "";
      console.log(`[interpret] API success from ${successfulModel}. Length:`, content.length);

      // Détection automatique de JSON brut ou entouré de Markdown
      let jsonContent = content.trim();
      if (jsonContent.startsWith('```json') || jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```.*\n?/, '').replace(/```$/, '');
      }

      // Trouver le premier '{' et fermer proprement
      const startIdx = jsonContent.indexOf('{');
      if (startIdx >= 0) {
        let braceCount = 0;
        let lastIdx = startIdx;
        let escape = false;
        for (let i = startIdx; i < jsonContent.length; i++) {
          const char = jsonContent[i];
          if (!escape) {
            if (char === '\\') escape = true;
            else if (char === '"') { /* flip string mode */ }
            else if (char === '{') braceCount++;
            else if (char === '}') braceCount--;

            if (braceCount === 0 && jsonContent[i] === '}') {
              lastIdx = i;
              break;
            }
          }
        }
        parsed = JSON.parse(jsonContent.substring(startIdx, lastIdx + 1));
      }
    } catch (parseError) {
      console.error('[interpret] JSON parse failed:', parseError);
    }
  }

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