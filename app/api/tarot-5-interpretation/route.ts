import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { cartes, userId, question } = await request.json();

    // Prompt pour IA avec 5 cartes alignées sur la question
    const cardNames = cartes.map((id: number, i: number) => {
      const names = [
        "Le Mat", "Le Bateleur", "La Papesse", "L'Impératrice", "L'Empereur", "Le Pape", "Les Amoureux", "Le Chariot",
        "La Justice", "Le Hermite", "La Roue de Fortune", "Le Fou", "La Force", "Le Pendu", "L'Arcane Inconnu",
        "La Tempérance", "Le Diable", "La Maison Dieu", "L'Étoile", "La Lune", "Le Soleil", "Le Jugement", "Le Monde",
        "As de Coupe", "Deux de Coupe", "Trois de Coupe", "Quatre de Coupe", "Cinq de Coupe", "Six de Coupe", "Sept de Coupe", "Huit de Coupe",
        "Neuf de Coupe", "Dix de Coupe", "Valet de Coupe", "Cavalière de Coupe", "Roi de Coupe",
        "As de Épée", "Deux de Épée", "Trois de Épée", "Quatre de Épée", "Cinq de Épée", "Six de Épée", "Sept de Épée", "Huit de Épée",
        "Neuf de Épée", "Dix de Épée", "Valet de Épée", "Cavalière de Épée", "Roi de Épée",
        "As de Batons", "Deux de Batons", "Trois de Batons", "Quatre de Batons", "Cinq de Batons", "Six de Batons", "Sept de Batons", "Huit de Batons",
        "Neuf de Batons", "Dix de Batons", "Valet de Batons", "Cavalière de Batons", "Roi de Batons",
        "As de Deniers", "Deux de Deniers", "Trois de Deniers", "Quatre de Deniers", "Cinq de Deniers", "Six de Deniers", "Sept de Deniers", "Huit de Deniers",
        "Neuf de Deniers", "Dix de Deniers", "Valet de Deniers", "Cavalière de Deniers", "Roi de Deniers"
      ];
      return names[id] || `Carte ${id + 1}`;
    });

    const prompt = `Tu es un oracle Tarot de Marseille. L'utilisateur a posé cette question: "${question}"

Tirage de 5 cartes:
- Carte 1 (Situation): ${cardNames[0]}
- Carte 2 (Défis): ${cardNames[1]}
- Carte 3 (Soutien): ${cardNames[2]}
- Carte 4 (Issue): ${cardNames[3]}
- Carte 5 (Conseil): ${cardNames[4]}

Réponds directement à la question en t'appuyant sur la signification de chaque carte et sa position dans le tirage. Sois clair, poétique et direct.
Réponds en JSON: {"situation":"...","defis":"...","soutien":"...","issue":"...","conseil":"..."}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b:free',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || data.message?.content || "";

    // Parser le JSON
    let parsed: Interpretation = {};
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {}
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
      situation: parsed.situation || "La situation se déploie selon les cycles naturels.",
      defis: parsed.defis || "Reconnaissez les résistances intérieures.",
      soutien: parsed.soutien || "Le soutien vient des forces inattendues.",
      issue: parsed.issue || "L'issue se dessine dans la lumière.",
      conseil: parsed.conseil || "Écoutez le sillage des étoiles."
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Erreur interprétation',
      situation: "Le chemin se dessine.",
      defis: "Les ombres portent leur leçon.",
      soutien: "La lumière guide.",
      issue: "L'issue se révèle.",
      conseil: "Avancez avec confiance."
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