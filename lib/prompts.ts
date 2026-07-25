// lib/prompts.ts
// Récupère les templates de prompts depuis la base Neon.
// Chaque route API charge son prompt via la clé unique, avec substitution des variables.

import { prisma } from './prisma';

/**
 * Récupère un template de prompt depuis la base et substitue les variables {{var}}.
 * @param key Clé unique du prompt (ex: 'choix-short', 'choix-deep')
 * @param vars Dictionnaire des variables à substituer (ex: { planet: 'Soleil', sign: 'Lion' })
 * @returns Le prompt prêt à envoyer au LLM
 */
export async function getPrompt(
  key: string,
  vars: Record<string, string>,
): Promise<string> {
  const row = await prisma.promptTemplate.findUnique({ where: { key } });
  if (!row) {
    throw new Error(
      `PromptTemplate "${key}" introuvable en base. Lance prisma/seed-prompt-templates.ts`,
    );
  }
  let content = row.content;
  for (const [k, v] of Object.entries(vars)) {
    // Remplacer TOUTES les occurrences (pas seulement la première)
    content = content.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
  }
  return content;
}
