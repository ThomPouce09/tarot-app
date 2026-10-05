// Contenu d'un augure dans la langue courante.
// Les échos sont stockés en 4 langues (textFr obligatoire, parallels nullables) :
// on choisit la variante demandée, sinon on retombe sur le français.
export type EchoText = {
  textFr?: string | null;
  textEn?: string | null;
  textEs?: string | null;
  textHi?: string | null;
};

export function pickEchoText(
  e: EchoText | null | undefined,
  lang: string,
): string {
  if (!e) return '';
  const fr = e.textFr || '';
  if (lang === 'en') return e.textEn || fr;
  if (lang === 'es') return e.textEs || fr;
  if (lang === 'hi') return e.textHi || fr;
  return fr;
}
