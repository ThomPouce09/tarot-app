// lib/phone.ts — Téléphone : normalisation + validation (une seule source).
// Le numéro est OBLIGATOIRE et UNIQUE à l'inscription : on stocke la forme
// normalisée, et la vérification d'unicité se fait sur cette forme (colonne
// User.phone en @unique côté base + pré-check serveur côté signup/update).
//
// Normalisation KISS : on garde les chiffres, un « + » éventuel en tête ;
// 00 → + (préfixe international) ; espaces/tirets/points/parentheses sautés.
// Le format national (0612…) reste tel quel — pas de supposition de pays.

/** Épuré : chiffres seuls (et + initial). Renvoie '' si rien de exploitable. */
export function normalizePhone(raw: unknown): string {
  let s = String(raw ?? '').trim();
  if (!s) return '';
  s = s.replace(/[()\s.\-–\u2011]/g, ''); // séparateurs courants
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (s.startsWith('+')) {
    const digits = '+' + s.slice(1).replace(/\D/g, '');
    // +33 6 12… ≡ 06 12… : la base est française, on range l'indicatif devant
    // un numéro à l'ancienne pour que les deux saisies se rencontrent.
    if (digits.startsWith('+33') && /^\+33[67][0-9]{8}$/.test(digits)) return '0' + digits.slice(3);
    return digits;
  }
  return s.replace(/\D/g, '');
}

/** Valide la forme normalisée : 7 à 15 chiffres, + facultatif en tête (E.164). */
export function isValidPhone(normalized: string): boolean {
  return /^\+?[0-9]{7,15}$/.test(normalized);
}
