import { NextRequest, NextResponse } from 'next/server';
import { TAROT_CARDS } from '@/lib/tarot-data';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { cartes, userId, question } = await request.json();

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

Les 5 cartes piochées dans l'ordre où elles ont été tirées sont :
1. ${cardNames[0]}
2. ${cardNames[1]}
3. ${cardNames[2]}
4. ${cardNames[3]}
5. ${cardNames[4]}

Interprète ces 5 cartes dans cette question. Donne une lecture riche, poétique et directe en français.

Réponds UNIQUEMENT avec un objet JSON valide, SANS markdown, SANS commentaires autour :
{"situation":"<comment les cartes précédentes décrivent la situation actuelle, 3-4 phrases>","defis":"<les obstacles et tensions, 3-4 phrases>","soutien":"<les soutiens, ressources, 3-4 phrases>","issue":"<l'évolution probable, 3-4 phrases>","conseil":"<le conseil pratique, 2-3 phrases>"}`;

    const apiKey = process.env.OPENROUTER_API_KEY;
    console.log('[tarot-5-interpretation] key loaded:', apiKey ? `YES (len=${apiKey.length}, prefix=${apiKey.substring(0, 8)})` : 'NO');
    console.log('[tarot-5-interpretation] cartes:', cartes, 'question:', question);

    let response: Response;
    try {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'poolside/laguna-m.1:free',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        })
      });
    } catch (fetchErr) {
      console.error('[tarot-5-interpretation] FETCH ERROR:', fetchErr);
      throw fetchErr;
    }

    console.log('[tarot-5-interpretation] OpenRouter status:', response.status);

    const data = await response.json();
    console.log('[tarot-5-interpretation] OpenRouter data keys:', Object.keys(data || {}));
    const content = data.choices?.[0]?.message?.content || data.message?.content || '';
    console.log('[tarot-5-interpretation] content length:', content.length);

    // Parser le JSON — plusieurs stratégies
    let parsed: Interpretation = {};
    if (content) {
      // Stratégie 1 : chercher tous les blocs {...} valides, prendre le dernier
      const blocks = content.match(/\{[\s\S]*?\}/g);
      if (blocks) {
        for (let i = blocks.length - 1; i >= 0; i--) {
          try {
            const candidate = JSON.parse(blocks[i]);
            if (candidate.situation || candidate.defis || candidate.soutien || candidate.issue || candidate.conseil) {
              parsed = candidate;
              break;
            }
          } catch (e) { /* keep trying next block */ }
        }
      }
      // Stratégie 2 : contenu brut
      if (!parsed.situation) {
        try {
          const direct = JSON.parse(content.trim());
          if (direct && typeof direct === 'object') parsed = direct;
        } catch (e) { /* not pure JSON, try regex */ }
      }
      // Stratégie 3 : regex par champ
      if (!parsed.situation) {
        const grab = (key: string) => {
          const m = content.match(new RegExp(`"?${key}"?\\s*:\\s*"?([^"\\n]+)"?`, 'i'));
          return m ? m[1].trim() : undefined;
        };
        parsed.situation = grab('situation');
        parsed.defis = grab('defis') || grab('défis');
        parsed.soutien = grab('soutien');
        parsed.issue = grab('issue');
        parsed.conseil = grab('conseil');
      }
    }

    // Enregistrer si userId fourni
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
        }
      } catch (e) {
        console.error('Error saving 5-card reading:', e);
      }
    }

    return NextResponse.json({
      situation: parsed.situation || "Les cartes se déploient selon votre question. Concentrez-vous sur l'instant présent pour percevoir ce qui se joue.",
      defis: parsed.defis || "Des tensions apparaissent, elles sont aussi des leviers de transformation.",
      soutien: parsed.soutien || "Vous portez en vous les ressources nécessaires pour traverser cette étape.",
      issue: parsed.issue || "L'évolution est en cours, elle se précise quand on avance pas à pas.",
      conseil: parsed.conseil || "Restez à l'écoute de votre intuition."
    });

  } catch (error) {
    console.error('tarot-5-interpretation error:', error);
    return NextResponse.json({
      error: 'Erreur interprétation',
      situation: "Les cartes invitent à un temps d'introspection.",
      defis: "Demeurer attentif à ce qui résonne en vous.",
      soutien: "Faites confiance à votre voix intérieure.",
      issue: "Une direction claire se dessine.",
      conseil: "Agissez avec patience."
    });
  }
}

interface Interpretation {
  situation?: string;
  defis?: string;
  soutien?: string;
  issue?: string;
  conseil?: string;
}
