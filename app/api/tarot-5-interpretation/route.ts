import { NextRequest, NextResponse } from 'next/server';
import { TAROT_CARDS, TarotCard } from '@/lib/tarot-data';
import { prisma } from '@/lib/prisma';

interface Interpretation {
  situation?: string;
  defis?: string;
  soutien?: string;
  issue?: string;
  conseil?: string;
}

// Fonction pour générer une interprétation poétique et dynamique s'il n'y a plus aucun réseau d'IA disponible.
function generateSmartOfflineFallback(cartes: number[], question?: string): Interpretation {
  const getCardDetails = (id: number): { name: string; keywords: string[]; arcana: string } => {
    const card = TAROT_CARDS.find((c) => c.id === id);
    return {
      name: card?.name || `Carte ${id}`,
      keywords: card?.keywords || ['mystère', 'destin'],
      arcana: card?.arcana || 'major'
    };
  };

  const card0 = getCardDetails(cartes[0]); // Sommet (Situation)
  const card1 = getCardDetails(cartes[1]); // Orient (Situation bis/forces)
  const card2 = getCardDetails(cartes[2]); // Synthèse (Issue)
  const card3 = getCardDetails(cartes[3]); // Occident (Défis)
  const card4 = getCardDetails(cartes[4]); // Base (Soutien)

  const kw0 = card0.keywords.join(', ');
  const kw1 = card1.keywords.join(', ');
  const kw2 = card2.keywords.join(', ');
  const kw3 = card3.keywords.join(', ');
  const kw4 = card4.keywords.join(', ');

  const situationTemplates = [
    `Le tirage s'ouvre avec ${card0.name} au sommet de votre ciel, symbolisant une phase d'exploration liée aux énergies de ${kw0}. Avec ${card1.name} à l'orient, vous posez actuellement des bases solides pour surmonter vos incertitudes. Les astres suggèrent que votre situation demande d'écouter attentivement ces signaux.`,
    `Actuellement, la présence de ${card0.name} indique un fort dynamisme marqué par les thèmes de ${kw0}. ${card1.name} à l'orient vient renforcer cela en apportant une dimension de ${kw1}. Vous êtes à la croisée des chemins, invité à canaliser ces flux pour définir clairement votre position actuelle.`,
    `Les cartes révèlent une atmosphère de transition. ${card0.name} domine la situation par sa vibration de ${kw0}, tandis que ${card1.name} éclaire votre flanc spirituel. C'est le moment d'accueillir ce mouvement de vie sans résistance, en restant ancré dans le présent.`
  ];

  const defisTemplates = [
    `Votre principal défi est incarné par ${card3.name} à l'occident. Cette carte pointe des tensions ou des peurs inconscientes liées à ${kw3}. L'enjeu sera de ne pas vous laisser déstabiliser par ces blocages passagers et d'apprendre à transmuter cette énergie en force d'action constructive.`,
    `L'obstacle actuel réside dans les vibrations de ${card3.name}. Les notions de ${kw3} bousculent vos certitudes et créent des résistances dans vos projets. Le défi sera de faire face à ces ombres avec lucidité, sans chercher de raccourcis faciles.`,
    `À l'occident, ${card3.name} suggère que vous traversez une zone de frottement. Les résistances intérieures ou extérieures tournent autour de ${kw3}. Considérez cette épreuve non comme un arrêt, mais comme un test de votre persévérance.`
  ];

  const soutienTemplates = [
    `Heureusement, vous pouvez vous appuyer fermement sur la base de votre tirage : ${card4.name}. Cette arcane vous insuffle des ressources insoupçonnées axées sur ${kw4}. L'univers vous invite à puiser dans cette force tranquille pour avancer avec une confiance renouvelée.`,
    `Le socle sur lequel vous reposez est extrêmement protecteur grâce à ${card4.name}. C'est une promesse de soutien, de ${kw4} et de stabilité profonde. N'hésitez pas à solliciter ces forces en vous pour équilibrer les doutes suscités par les défis actuels.`,
    `Votre ancrage réside dans les qualités de ${card4.name}. En incarnant pleinement les principes de ${kw4}, vous trouverez la paix intérieure et la clarté nécessaires pour dissiper les doutes du mental.`
  ];

  const issueTemplates = [
    `L'issue probable de votre tirage est guidée par l'arcane de synthèse : ${card2.name}. Elle annonce une résolution harmonieuse et lumineuse axée sur ${kw2}. Votre cheminement spirituel et vos efforts vous guident directement vers cet accomplissement naturel.`,
    `La synthèse finale avec ${card2.name} indique que l'horizon se dégage vers un renouveau constructif. Les thèmes de ${kw2} prendront le dessus à mesure que vous intégrerez les leçons de ce tirage. Faites confiance au timing parfait de la vie.`,
    `L'évolution de votre situation tend vers l'accomplissement décrit par ${card2.name}. Une réconciliation intime avec les concepts de ${kw2} vous permettra de franchir ce cap avec sagesse et plénitude.`
  ];

  const conseilTemplates = [
    `L'oracle vous conseille d'embrasser l'énergie de ${card2.name} : restez à l'écoute de votre intuition profonde et agissez avec bienveillance envers vous-même.`,
    `Le conseil secret des cartes est de cultiver la patience : laissez les enseignements de ${card4.name} s'infuser doucement dans votre quotidien pour guider chacun de vos pas.`,
    `Soyez le maître de votre destinée en acceptant les métamorphoses induites par ce tirage. La clé est de rester authentique face aux défis.`
  ];

  // Sélectionner un index pseudo-aléatoire basé sur la somme des IDs des cartes pour garantir une diversité de lecture
  const seed = cartes.reduce((acc, val) => acc + val, 0);
  
  return {
    situation: situationTemplates[seed % situationTemplates.length],
    defis: defisTemplates[(seed + 1) % defisTemplates.length],
    soutien: soutienTemplates[(seed + 2) % soutienTemplates.length],
    issue: issueTemplates[(seed + 3) % issueTemplates.length],
    conseil: conseilTemplates[(seed + 4) % conseilTemplates.length],
  };
}

export async function POST(request: NextRequest) {
  const { cartes, userId, question } = await request.json().catch(() => ({ cartes: null, userId: null, question: null }));

  if (!cartes || !Array.isArray(cartes) || cartes.length !== 5) {
    return NextResponse.json(
      { error: 'Format invalide : attend un tableau de 5 cartes' },
      { status: 400 }
    );
  }

  // Noms complets depuis TAROT_CARDS (source de vérité)
  const cardNames = cartes.map((id: number) => {
    const card = TAROT_CARDS.find((c) => c.id === id);
    return card?.name || `Carte ${id}`;
  });

  const prompt = `Tu es un oracle expert du Tarot de Marseille.

L'utilisateur a posé cette question : "${question || 'Quelle direction prendre ?'}"

Les 5 cartes piochées dans l'ordre de la croix de tirage (1.Sommet, 2.Orient, 3.Synthèse, 4.Occident, 5.Base) sont :
1. ${cardNames[0]} (Sommet - Représente la Situation)
2. ${cardNames[1]} (Orient - Représente les Forces/Opportunités)
3. ${cardNames[2]} (Synthèse - Représente l'Issue et l'évolution globale)
4. ${cardNames[3]} (Occident - Représente les Défis et obstacles)
5. ${cardNames[4]} (Base - Représente le Soutien et fondations)

Interprète ces 5 cartes en français. Donne une lecture riche, poétique, encourageante et directe.

Réponds UNIQUEMENT avec un objet JSON valide, SANS markdown, SANS commentaires autour :
{"situation":"<analyse de la situation combinant Sommet et Orient, 3-4 phrases>","defis":"<analyse des obstacles et peurs liée à la carte Occident, 3-4 phrases>","soutien":"<analyse des forces d'ancrage liée à la carte Base, 3-4 phrases>","issue":"<l'évolution probable de synthèse, 3-4 phrases>","conseil":"<le conseil spirituel et pratique de l'oracle, 2-3 phrases>"}`;

  const apiKey = process.env.OPENROUTER_API_KEY;

  // Liste des modèles OpenRouter à tester en cascade si l'un échoue
  const modelsToTry = [
    'openai/gpt-oss-120b:free',
    'meta-llama/llama-3-8b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
    'google/gemma-2-9b-it:free',
    'qwen/qwen-2-7b-instruct:free'
  ];

  let response: Response | null = null;
  let successfulModel: string | null = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[tarot-5-interpretation] Attempting OpenRouter API call with model: ${model}`);
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: 'Tu es un oracle expert du Tarot de Marseille. Réponds UNIQUEMENT avec un JSON valide sans aucune réflexion.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.72,
          max_tokens: 1200,
        })
      });

      if (res.ok) {
        response = res;
        successfulModel = model;
        break; // Succès ! On arrête la boucle
      } else {
        const errText = await res.text();
        console.warn(`[tarot-5-interpretation] Model ${model} failed with status ${res.status}:`, errText);
      }
    } catch (fetchErr) {
      console.error(`[tarot-5-interpretation] Error fetching with model ${model}:`, fetchErr);
    }
  }

  // ─── FALLBACK: FreeLLM Custom API ─────────────────────────
  if (!response) {
    try {
      console.log('[tarot-5-interpretation] OpenRouter failed. Attempting FreeLLM fallback...');
      const freeLlmKey = process.env.FREELLM_API_KEY || '';
      const res = await fetch('http://localhost:3001/v1/chat/completions', {
        method: 'POST',
        headers: {
          ...(freeLlmKey ? { 'Authorization': `Bearer ${freeLlmKey}` } : {}),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'auto',
          messages: [
            { role: 'system', content: 'Tu es un oracle expert du Tarot de Marseille. Réponds UNIQUEMENT avec un JSON valide sans aucune réflexion.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.72,
          max_tokens: 1200,
        })
      });

      if (res.ok) {
        response = res;
        successfulModel = 'freellm-auto';
        console.log('[tarot-5-interpretation] FreeLLM fallback succeeded.');
      } else {
        const errText = await res.text();
        console.warn(`[tarot-5-interpretation] FreeLLM fallback failed with status ${res.status}:`, errText);
      }
    } catch (fetchErr) {
      console.error('[tarot-5-interpretation] FreeLLM fallback error:', fetchErr);
    }
  }

  let parsed: Interpretation = {};

  if (response) {
    try {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.message?.content || '';
      console.log(`[tarot-5-interpretation] Successful API response from ${successfulModel}. Content length:`, content.length);

      if (content) {
        let jsonContent = content.trim();
        
        // Nettoyage Markdown si présent
        if (jsonContent.startsWith('```json')) {
          jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
        } else if (jsonContent.startsWith('```')) {
          jsonContent = jsonContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }
        
        const startIdx = jsonContent.indexOf('{');
        if (startIdx !== -1) {
          let braceCount = 0;
          let inString = false;
          let escape = false;
          let lastGoodEnd = -1;
          
          for (let i = startIdx; i < jsonContent.length; i++) {
            const char = jsonContent[i];
            
            if (escape) {
              escape = false;
              continue;
            }
            
            if (char === '\\\\') {
              escape = true;
              continue;
            }
            
            if (char === '"' && !escape) {
              inString = !inString;
              continue;
            }
            
            if (!inString) {
              if (char === '{') braceCount++;
              if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                  lastGoodEnd = i;
                }
              }
            }
          }
          
          if (lastGoodEnd !== -1) {
            jsonContent = jsonContent.substring(startIdx, lastGoodEnd + 1);
          }
        }
        
        parsed = JSON.parse(jsonContent);
      }
    } catch (e) {
      console.error('[tarot-5-interpretation] Failed to parse API JSON content. Falling back to Smart offline generator.', e);
    }
  }

  // Si l'appel a complètement échoué ou si le JSON reçu est vide / invalide, on utilise notre générateur intelligent offline !
  if (!parsed.situation || !parsed.defis || !parsed.soutien || !parsed.issue || !parsed.conseil) {
    console.log('[tarot-5-interpretation] Generating dynamic offline fallback interpretation...');
    parsed = generateSmartOfflineFallback(cartes, question);
  }

  // Enregistrer le tirage si userId fourni
  if (userId) {
    try {
      const user = await prisma.user.findUnique({ where: { email: userId } });
      if (user) {
        await prisma.reading.create({
          data: {
            userId: user.id,
            type: 'tarot',
            question: question || null,
            cards: JSON.stringify(cartes.map((id: number) => ({ id, reversed: false }))),
            interpretation: JSON.stringify({
              situation: parsed.situation,
              defis: parsed.defis,
              soutien: parsed.soutien,
              issue: parsed.issue,
              conseil: parsed.conseil
            })
          }
        });
        console.log('[tarot-5-interpretation] Reading saved successfully to database for user:', userId);
      }
    } catch (dbError) {
      console.error('[tarot-5-interpretation] Database save error:', dbError);
    }
  }

  return NextResponse.json(parsed);
}
