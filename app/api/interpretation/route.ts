import { NextRequest, NextResponse } from 'next/server';
import { TAROT_CARDS, TarotCard } from '@/lib/tarot-data';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { cartes, userId } = await req.json();

    if (!cartes || !Array.isArray(cartes) || cartes.length !== 3) {
      return NextResponse.json(
        { error: 'Format invalide : attend un tableau de 3 cartes' },
        { status: 400 }
      );
    }

    // Récupérer les données complètes des 78 cartes depuis tarot-data
    const getCardData = (id: number): { nom: string; meanings: { upright: string; keywords: string[] } } => {
      const card = TAROT_CARDS.find(c => c.id === id);
      if (!card) {
        return { nom: `Carte ${id}`, meanings: { upright: 'Signification inconnue', keywords: [] } };
      }
      
      // Construire une signification basée sur le type de carte
      const upright = buildCardMeaning(card);
      return { nom: card.name, meanings: { upright, keywords: card.keywords } };
    };

    // Fonction pour générer une signification complète pour chaque carte
    function buildCardMeaning(card: TarotCard): string {
      if (card.arcana === 'major') {
        return getMajorArcanaMeaning(card.number);
      } else {
        return getMinorArcanaMeaning(card);
      }
    }

    function getMajorArcanaMeaning(number: number): string {
      const meanings: Record<number, string> = {
        0: 'Nouveau départ, innocence, spontanéité, esprit libre, aventure',
        1: 'Créativité, opportunités, compétences, manifestation, pouvoir personnel',
        2: 'Intuition, sagesse intérieure, mystère, subconscient, connaissance cachée',
        3: 'Abondance, créativité, maternité, nature, féminin sacré',
        4: 'Structure, autorité, stabilité, leadership, pouvoir masculin',
        5: 'Spiritualité, tradition, enseignement, sagesse, guidance',
        6: 'Amour, harmonie, choix, union, alignement des valeurs',
        7: 'Volonté, victoire, détermination, contrôle, direction',
        8: 'Équilibre, vérité, cause à effet, équité, justice karmique',
        9: 'Introspection, solitude, sagesse, recherche intérieure, guidance',
        10: 'Changement, cycles, destin, fortune, point tournant',
        11: 'Courage, compassion, maîtrise de soi, puissance intérieure',
        12: 'Lâcher-prise, nouvelle perspective, sacrifice, pause, attente',
        13: 'Fin de cycle, transformation, renaissance, transition, libération',
        14: 'Équilibre, patience, modération, alchimie, harmonie',
        15: 'Attachements, tentation, ombre, libération, matérialisme',
        16: 'Révélation brutale, transformation, awakening, libération soudaine',
        17: 'Espoir, inspiration, sérénité, renouveau, spiritualité',
        18: 'Illusion, rêves, inconscient, peur, intuition profonde',
        19: 'Joie, succès, vitalité, chaleur, illumination',
        20: 'Renaissance, appel intérieur, élévation, absolution',
        21: 'Achèvement, accomplissement, unité, voyage, complétude',
      };
      return meanings[number] || 'Signification mystique';
    }

    function getMinorArcanaMeaning(card: TarotCard): string {
      const suitMeanings: Record<string, string> = {
        'Bâtons': 'Action, créativité, ambition, énergie, passion, entreprise, carrière',
        'Coupes': 'Émotions, amour, relations, intuition, rêves, sentiments, compassion',
        'Épées': 'Intellect, vérité, conflit, justice, communication, esprit, clarté',
        'Deniers': 'Matériel, travail, santé, nature, prospérité, stabilité, finances',
      };
      
      const courtCardMeanings: Record<number, string> = {
        11: 'Valet - Messager, nouvelle, apprenti, curiosité,探索',
        12: 'Cavalier - Action rapide, voyage, changement, mouvement',
        13: 'Reine - Maturité, nurturing, intuition rafforzée, maîtrise émotionnelle',
        14: 'Roi - Autorité, maîtrise, leadership, expertise, stabilité',
      };

      const suit = card.suit || 'mystère';
      const baseMeaning = suitMeanings[suit] || 'Énergie mystique';
      
      if (card.number >= 11) {
        // Carte de la cour
        const courtMeaning = courtCardMeanings[card.number] || 'Personne influente';
        return `${courtMeaning} dans le domaine de ${suitMeanings[suit] || 'la vie'}`;
      } else {
        // Carte numérique (As à 10)
        const numberMeanings: Record<number, string> = {
          1: 'Nouveau départ, potentiel, germe',
          2: 'Équilibre, choix, partenariat',
          3: 'Croissance, collaboration, expression',
          4: 'Stabilité, repos, foundation',
          5: 'Conflit, perte, défi',
          6: 'Harmonie, guérison, nostalgie',
          7: 'Réflexion, évaluation, patience',
          8: 'Mouvement, changement, adaptation',
          9: 'Accomplissement, satisfaction, culmination',
          10: 'Complétude, fin de cycle, plénitude',
        };
        const numMeaning = numberMeanings[card.number] || 'Énergie';
        return `${numMeaning} dans le domaine de ${baseMeaning}`;
      }
    }

    const carte1 = getCardData(cartes[0]);
    const carte2 = getCardData(cartes[1]);
    const carte3 = getCardData(cartes[2]);

    const prompt = `Tu es un maître du tarot. Interprète ce tirage de 3 cartes en français.

Tirage :
- Carte 1 (PASSÉ) : ${carte1.nom} — ${carte1.meanings.upright}
- Carte 2 (PRÉSENT) : ${carte2.nom} — ${carte2.meanings.upright}  
- Carte 3 (AVENIR) : ${carte3.nom} — ${carte3.meanings.upright}

Règles STRICTES :
1. Réponds UNIQUEMENT en JSON valide, RIEN d'autre
2. **3-4 phrases COURTES par carte** (sois plus détaillé qu'avant)
3. Ton mystique et bienveillant
4. Pour CHAQUE carte, commence par situer la temporalité :
   - Carte 1 (Passé) : Commence par "Cette carte révèle que dans votre passé..." ou "Votre passé a été marqué par..."
   - Carte 2 (Présent) : Commence par "Cette carte indique que dans votre présent..." ou "Actuellement, vous traversez..."
   - Carte 3 (Avenir) : Commence par "Cette carte annonce que dans votre avenir..." ou "L'avenir vous réserve..."
5. Utilise "vous" pour t'adresser au consultant
6. Sois précis sur ce que la carte signifie POUR la temporalité indiquée
7. Développe un peu plus qu'une simple phrase : explique **comment** la carte influence cette période de vie
8. Termine chaque interprétation par un **conseil pratique** ou une **mise en garde** si pertinent

Format JSON obligatoire (complète les 3 cartes !) :
{"carte1":"texte ici","carte2":"texte ici","carte3":"texte ici"}`;

    // Appel à l'API OpenRouter (modèle gratuit concis)
    let response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b:free',
        provider: {
          order: ['Fireworks', 'Together'],
          allow_fallbacks: true,
        },
        messages: [
          {
            role: 'system',
            content: 'Tu es un maître du tarot. Réponds UNIQUEMENT avec un JSON valide. RIEN d\'autre. Pas de réflexion, pas d\'explication. Juste le JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1200,  // Augmenté pour 3-4 phrases par carte
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erreur API OpenRouter:', errorData);

      if (response.status === 429) {
        console.warn('openai/gpt-oss-120b:free rate-limité, fallback vers openai/gpt-oss-120b:free');
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-oss-120b:free',
            messages: [
              {
                role: 'system',
                content: 'Tu es un maître du tarot. Réponds UNIQUEMENT avec un JSON valide. RIEN d\'autre. Pas de réflexion, pas d\'explication. Juste le JSON.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 1200,
            stream: false,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;

          if (content) {
            console.log('Réponse brute fallback de l\'IA:', content);
            const jsonContent = extractValidJSON(content);
            return NextResponse.json(JSON.parse(jsonContent));
          }
        }
      }

      return NextResponse.json(
        { error: 'Échec de l\'appel à l\'IA' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'Réponse vide de l\'IA' },
        { status: 500 }
      );
    }

    console.log('Réponse brute de l\'IA:', content);

    // Extraire le JSON valide même si le modèle continue de parler après OU si la réponse est coupée
    function extractValidJSON(text: string): string {
    // Concatenation des objets JSON si plusieurs reçus
    const objects: Record<string, any> = {};
    const regex = /\{[^}]*\}(?:\{[^{}]*\})*\}/gs;
    let match;
    while ((match = regex.exec(text)) !== null) {
      try {
        const obj = JSON.parse(match[0]);
        Object.assign(objects, obj);
      } catch (e) {}
    }
    if (Object.keys(objects).length > 0) {
      return JSON.stringify(objects);
    }
    
      let jsonContent = text.trim();
      
      // Enlever les ```json ... ``` si présents
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }
      
      // Chercher le premier '{'
      const startIdx = jsonContent.indexOf('{');
      if (startIdx === -1) return jsonContent;
      
      // Compter les accolades pour trouver la fin du JSON
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
        
        if (char === '\\') {
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
      
      // Si on a trouvé un JSON complet, le retourner
      if (lastGoodEnd !== -1) {
        return jsonContent.substring(startIdx, lastGoodEnd + 1);
      }
      
      // Si le JSON est incomplet, essayer de le réparer
      // Chercher jusqu'où on est arrivé (dernière valeur complète)
      const partialJson = jsonContent.substring(startIdx);
      
      // Fermer les strings ouvertes
      let fixed = partialJson;
      const stringOpenCount = (fixed.match(/"/g) || []).length;
      if (stringOpenCount % 2 === 1) {
        // String non fermée
        fixed = fixed + '"';
      }
      
      // Fermer les accolades ouvertes
      const openBraces = (fixed.match(/{/g) || []).length;
      const closeBraces = (fixed.match(/}/g) || []).length;
      if (openBraces > closeBraces) {
        fixed = fixed + '}'.repeat(openBraces - closeBraces);
      }
      
      console.log('JSON réparé:', fixed);
      return fixed;
    }

    const jsonContent = extractValidJSON(content);
    console.log('JSON extrait:', jsonContent);

    let interpretation;
    try {
      interpretation = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Erreur de parsing JSON:', parseError, 'Content:', jsonContent);
      return NextResponse.json(
        { error: 'Format de réponse invalide de l\'IA' },
        { status: 500 }
      );
    }

    // Enregistrer le tirage si userId fourni
    if (userId) {
      try {
        const user = await prisma.user.findUnique({ where: { email: userId } });
        if (user) {
          const cardNames = await Promise.all(
            cartes.map(async (cardIdx: number) => {
              return TAROT_CARDS[cardIdx] ?? 'Carte inconnue';
            })
          );

          await prisma.reading.create({
            data: {
              userId: user.id,
              type: 'tarot',
              cards: JSON.stringify(
                cartes.map((idx: number, i: number) => ({
                  id: idx,
                  name: cardNames[i],
                  position: ['past', 'present', 'future'][i] as 'past' | 'present' | 'future',
                }))
              ),
              interpretation: JSON.stringify(interpretation),
            },
          });
        }
      } catch (e) {
        console.error('Erreur enregistrement tirage:', e);
      }
    }

    return NextResponse.json(interpretation);
  } catch (error) {
    console.error('Erreur dans /api/interpretation:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}