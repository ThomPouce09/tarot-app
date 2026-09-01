// lib/dates.ts
// Helpers de dates partagés (utilisés par les routes d'auth).

// Calcule l'âge (années révolues) depuis une date de naissance ISO (YYYY-MM-DD).
export function calcAge(dob: string): number | null {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
}
