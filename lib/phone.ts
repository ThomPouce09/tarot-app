// lib/phone.ts — Téléphone : normalisation + validation (une seule source).
import { DIAL_COUNTRIES } from './countries';

const DIAL_SORTED = [...DIAL_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
const DIAL_FLAG: Record<string, string> = Object.fromEntries(DIAL_COUNTRIES.map((c) => [c.dial, c.flag]));
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
    // +33 6 12… ≡ 06 12… (mobile) et +33 1 23… ≡ 01 23… (fixe) : la base est
    // française, on range l'indicatif devant un numéro national pour que les
    // deux saisies se rencontrent sous une seule clé.
    if (/^\+33[1-9][0-9]{8}$/.test(digits)) return '0' + digits.slice(3);
    return digits;
  }
  return s.replace(/\D/g, '');
}

/** Valide la forme normalisée : 7 à 15 chiffres, + facultatif en tête (E.164). */
export function isValidPhone(normalized: string): boolean {
  return /^\+?[0-9]{7,15}$/.test(normalized);
}

/** Assemble le champ téléphone (select indicatif + saisie nationale) en une
 *  forme normalisée unique : « +33 » + « 06 12 34 56 78 » (ou « 6 12… ») →
 *  « 0612345678 » ; une saisie déjà internationale (commençant par +) passe
 *  telle quelle. C'est LA fonction à appeler avant normalizePhone/signup. */
export function composePhone(dial: string, national: string): string {
  const nat = String(national ?? '').trim();
  if (!nat) return '';
  if (nat.startsWith('+') || nat.startsWith('00')) return normalizePhone(nat);
  const d = String(dial ?? '').trim();
  if (!d.startsWith('+')) return normalizePhone(nat);
  // « 0 » initial national déjà inclus (06…) avec indicatif → on l'enlève pour
  // que +33/06 et +33/006 donnent la même clé.
  const body = nat.startsWith('0') ? nat.slice(1) : nat;
  return normalizePhone(d + body);
}

// ── Lecture d'un numéro stocké pour le pré-remplissage des champs ───────────
// Miroir de composePhone : « 0612345678 » → { dial:'+33', national:'612345678' } ;
// « +12125550173 » → { dial:'+1', national:'2125550173' }. Clé inconnue → dial
// vide (le sélecteur retombe sur le défaut, le champ garde la saisie brute).
export function splitStoredPhone(stored: string): { dial: string; national: string } {
  const e = String(stored || '').trim();
  if (!e) return { dial: '', national: '' };
  if (/^0[0-9]{7,14}$/.test(e)) return { dial: '+33', national: e.slice(1) };
  const m = /^\+([0-9]{1,3})([0-9]{4,14})$/.exec(e);
  if (m) {
    const dial = '+' + m[1];
    // Plus long préfixe connu d'abord (+1 vs +1684…) : liste triée par dial.
    let found = '';
    for (const c of DIAL_SORTED) {
      if (e.startsWith(c.dial) && c.dial.length > found.length) found = c.dial;
    }
    if (found) return { dial: found, national: e.slice(found.length).replace(/\D/g, '') };
    return { dial, national: m[2] };
  }
  return { dial: '', national: e };
}

/** Affichage officiel : « 🇫🇷 +33 6 12 34 56 78 » (groupes de 2 en France). */
export function phoneDisplay(stored: string): string {
  const { dial, national } = splitStoredPhone(stored);
  if (!dial || !national) return String(stored || '').trim();
  const flag = DIAL_FLAG[dial] || '';
  let nat = national;
  if (dial === '+33' && nat.length === 9) {
    nat = nat[0] + ' ' + nat.slice(1).replace(/([0-9]{2})(?=[0-9])/g, '$1 ');
  } else if (dial === '+1' && nat.length === 10) {
    nat = nat.slice(0, 3) + ' ' + nat.slice(3, 6) + ' ' + nat.slice(6); // NANP 3-3-4
  } else {
    nat = nat.replace(/([0-9]{3})(?=[0-9])/g, '$1 ');
  }
  return (flag ? flag + ' ' : '') + dial + ' ' + nat;
}
