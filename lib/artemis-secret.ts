// Garde firme du SECRET d'Artémis : le parchemin secret-artemis.png est un
// cadre à taille fixe — le texte gravé ne doit jamais déborder. On coupe à 2
// phrases maximum (le modèle peut désobéir au prompt), en préservant la
// ponctuation finale. Découpe sur « . ! ? » suivis d'espace/fin : pas de coupe
// en plein mot. Pur et sans dépendance : importable côté serveur ET client.
export function clampTwoSentences(s: string): string {
  if (!s) return '';
  const parts = s.match(/[^.!?]+[.!?]+(?:\s|$)/g);
  let two = parts ? parts.slice(0, 2).join('').trim() : s.trim();
  // EXIGENCE user : le secret se LIT en DEUX phrases courtes. Soit le modèle
  // en rend trois ou plus (on garde les deux premières), soit UNE seule
  // longue énumération liée par virgules/« et » (avec ou sans point final) —
  // dans ce cas on la scinde à la FRONTIÈRE DE MEMBRE : le point remplace la
  // conjonction ou la virgule, la suite repart en majuscule. Jamais une queue
  // de phrase bancale.
  if (!parts || parts.length < 2) {
    const bare = two.replace(/[.!?]+\s*$/, '');
    if (bare.split(/\s+/).length >= 10) {
      // frontière la plus naturelle : « , et » / « et » seul après ≥28 car.,
      // sinon première virgule après ≥28 car.
      let m = bare.match(/^(.{28,}?)\s*,?\s+et\s+(.+)$/);
      if (!m) m = bare.match(/^(.{28,}?)\s*[,;]\s+(.+)$/);
      if (m) {
        const a = m[1].replace(/[,;]\s*$/, '').trim();
        const b = m[2].trim();
        if (a.length >= 8 && b.length >= 6) {
          two = a + '. ' + b.charAt(0).toUpperCase() + b.slice(1) + (/[.!?]$/.test(b) ? '' : '.');
        }
      } else if (!two.endsWith('.') && !two.endsWith('!') && !two.endsWith('?')) {
        two += '.';
      }
    }
  } else if (parts.length > 2) {
    two = parts.slice(0, 2).join('').trim();
  }
  return two.length > 320 ? two.slice(0, 320).replace(/\s+\S*$/, '') + '…' : two;
}
