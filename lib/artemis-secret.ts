// Garde firme du SECRET d'Artémis : le parchemin secret-artemis.png est un
// cadre à taille fixe — le texte gravé ne doit jamais déborder. On coupe à 2
// phrases maximum (le modèle peut désobéir au prompt), en préservant la
// ponctuation finale. Découpe sur « . ! ? » suivis d'espace/fin : pas de coupe
// en plein mot. Pur et sans dépendance : importable côté serveur ET client.
export function clampTwoSentences(s: string): string {
  if (!s) return '';
  const parts = s.match(/[^.!?]+[.!?]+(?:\s|$)/g);
  if (!parts) return s.slice(0, 300).trim();
  const two = parts.slice(0, 2).join('').trim();
  return two.length > 320 ? two.slice(0, 320).replace(/\s+\S*$/, '') + '…' : two;
}
