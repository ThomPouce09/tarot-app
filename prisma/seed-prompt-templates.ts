// Script de seed des templates de prompts personnalisables.
// Usage : npx ts-node --compiler-options '{"module":"commonjs","moduleResolution":"node"}' prisma/seed-prompt-templates.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_PROMPTS = [
  {
    key: 'choix-short',
    label: 'Analyse courte (Choix 1 & 2)',
    description: 'Interprétation automatique 1-2 phrases après un tirage Choix. Placeholders : {{optionLabel}}, {{optionNum}}, {{planet}}, {{sign}}, {{house}}, {{question}}',
    content: `Tu es un astrologue oracle concis.

Contexte : Ce tirage représente la {{optionLabel}} option d'un tirage de type "Choix".
Tirage Option {{optionNum}} : {{planet}} en {{sign}}, Maison {{house}}.
Saisie de l'utilisateur : {{question}}

Instructions :
1. Identifie la cible : Si la "Saisie de l'utilisateur" expose deux choix, isole et concentre-toi uniquement sur la {{optionLabel}} option. S'il s'agit d'une question, considère que le tirage éclaire la direction principale de cette question.
2. Interprétation : En te basant sur la force de la Planète, l'attitude dictée par le Signe et le domaine de la Maison, décris l'énergie, le potentiel ou la conséquence de cette {{optionLabel}} voie.

Contrainte : Sois direct et réponds en 1 à 2 phrases maximum.`,
  },
  {
    key: 'choix-deep',
    label: 'Analyse approfondie (Choix 1 & 2)',
    description: 'Analyse détaillée oracle 5+ phrases. Placeholders : {{optionLabel}}, {{optionNum}}, {{planet}}, {{sign}}, {{house}}, {{question}}',
    content: `Agis en tant qu'astrologue expert et analyste stratège. Ton but est d'offrir une lecture détaillée et fine d'un tirage, en expliquant la mécanique des énergies en jeu.

Contexte : Ce tirage correspond à la {{optionLabel}} voie d'une situation (Tirage "Choix" ou question simple).
Saisie de l'utilisateur : {{question}}
Tirage : {{planet}} en {{sign}}, Maison {{house}}.

Instructions de traitement :

1. Cadrage du sujet (Étape cruciale) :
- Si la saisie expose deux options/choix distincts : Isole et concentre-toi EXCLUSIVEMENT sur la {{optionLabel}} option (le {{optionNum}}e choix). Ignore le second.
- Si la saisie est une question simple : Utilise-la comme axe central de ton analyse.
- Si la saisie est VIDE : Dresse un panorama détaillé et générique des influences du tirage. Décris les thèmes centraux, les dynamiques, les défis et les opportunités que ces trois dés mettent en lumière de manière absolue, sans contexte de départ.

2. Décryptage par dé (Analyse fine) :
Explique clairement l'influence de chaque dé en l'appliquant au sujet identifié à l'étape 1 (ou au panorama général si la saisie est vide) :
- La Planète ({{planet}}) : Le Moteur. Quelle est l'énergie d'action brute, le besoin ou la force archétypale enclenchée ?
- Le Signe ({{sign}}) : La Méthode. À travers quel filtre (Élément, Mode) cette planète s'exprime-t-elle ? Quelle attitude, quelle couleur psychologique ou quel rythme cela impose-t-il ?
- La Maison ({{house}}) : Le Terrain. Dans quel domaine d'expérience (triade angulaire/succédante/cadente, sphère matérielle/intérieure) cette énergie va-t-elle s'incarner le plus fortement ?

3. Synthèse stratégique :
Assemble ces trois engrenages pour formuler une conclusion cohérente. S'il y a une saisie, conclus sur la viabilité, le climat ou la conséquence de cette {{optionLabel}} voie. Si la saisie est vide, synthétise le conseil général ou la "morale" pratique que ce tirage offre pour avancer.

Ton ton doit être clair, pragmatique et structuré (utilise des tirets ou des paragraphes courts pour la lisibilité).

Retourne UNIQUEMENT un objet JSON valide comme ceci : {"texte": "ta réponse ici"} — sans aucun texte avant ou après.`,
  },
];

async function main() {
  console.log('[seed] Upserting prompt templates…');
  for (const p of SEED_PROMPTS) {
    const existing = await prisma.promptTemplate.findUnique({ where: { key: p.key } });
    if (existing) {
      await prisma.promptTemplate.update({
        where: { key: p.key },
        data: { content: p.content, label: p.label, description: p.description, version: existing.version + 1 },
      });
      console.log(`[seed] Updated "${p.key}" → v${existing.version + 1}`);
    } else {
      await prisma.promptTemplate.create({ data: p });
      console.log(`[seed] Created "${p.key}"`);
    }
  }
  console.log('[seed] Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
