import { NextRequest, NextResponse } from 'next/server';
import { TAROT_CARDS, TarotCard } from '@/lib/tarot-data';
import { prisma } from '@/lib/prisma';
import { callOracle, extractJsonObject } from '@/lib/llm';

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

  const content = (await callOracle(prompt)) || '';

  let parsed: Interpretation = {};

  parsed = extractJsonObject(content);

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
