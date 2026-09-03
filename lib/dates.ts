// lib/dates.ts
// Helpers de dates partagés (utilisés par les routes d'auth).

// Calcule l'âge (années révolues) depuis une date de naissance ISO (YYYY-MM-DD).
export function calcAge(dob: string): number | null {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}

// Garde de suppression de compte : nb de jours avant de pouvoir recréer un compte.
export const DELETION_GRACE_DAYS = 40;

// Jours écoulés (nombres entiers) depuis une date.
export function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}
