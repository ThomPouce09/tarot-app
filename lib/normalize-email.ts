// lib/normalize-email.ts — Canonicalisation unique des emails.
// Gmail (et bien d'autres) traite les adresses SANS distinction de casse :
// « Jean.Dupont@gmail.com » === « jean.dupont@gmail.com ». Sans normalisation,
// ces deux formes créent DEUX lignes dans User (le @unique de Prisma compare
// byte à byte) → deux comptes « identiques » pour l'utilisateur, abonnements
// et historiques éparpillés, et la connexion Google (qui, elle, renvoie
// l'email en minuscules) tombe sur une ligne que le compte « officiel » ne
// connaît pas — l'espace personnel plante alors sur un profil incohérent.
//
// RÈGLE : tout email entrant dans le système passe par normalizeEmail()
// AVANT toute lecture/écriture base. Le stock est donc canonique, l'unicité
// est réellement vérifiée en base.
export function normalizeEmail(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase();
}
