// ── Rappels push : calcul de l'heure locale par fuseau ───────────────────
// Le plan Vercel Hobby impose un cron par jour MAX par job : on utilise donc
// 24 jobs (un par heure UTC, déclenchés à :30) et chaque exécution décide,
// pour chaque user, si « maintenant » tombe dans sa bande d'envoi locale.
// L'offset UTC est calculé via l'IANA (Intl) → l'heure d'été/hiver est
// gérée automatiquement : un user d'Europe/Paris reçoit toujours ~18h30
// LOCALE, été comme hiver (l'heure UTC cible change, le job qui le matche aussi).

export const DEFAULT_REMINDER_HOUR = 18; // 18h30 locale
const MINUTE_OF_HOUR = 30;               // bande centrée sur :30 local
const BAND_TOLERANCE_MIN = 45;           // ±45 min : marge sur la dérive des crons Hobby (±59)

// Offset UTC (en minutes) d'un fuseau IANA à un instant donné (gère la DST).
export function tzOffsetMinutes(tz: string, at: Date): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const p: Record<string, string> = {};
    for (const part of dtf.formatToParts(at)) if (part.type !== 'literal') p[part.type] = part.value;
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return Math.round((asUTC - Math.floor(at.getTime() / 1000) * 1000) / 60000);
  } catch {
    return 60; // fuseau invalide -> repli Paris (UTC+1)
  }
}

// Parties locales (année/mois/jour/heure) d'un instant dans un fuseau.
export function localParts(tz: string, at: Date): { y: number; m: number; d: number; h: number } {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(at)) if (part.type !== 'literal') p[part.type] = part.value;
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour };
}

export function localDayKey(tz: string, at: Date): string {
  const { y, m, d } = localParts(tz, at);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Clé du jour LOCAL UTC (pour le seed du message du jour : même texte partout).
export function utcDayKey(at: Date): string {
  return at.toISOString().slice(0, 10);
}

// Le user doit-il recevoir son rappel maintenant ?
// `nowUTC` = horodatage de l'exécution du cron. `hour` = heure locale cible.
export function inReminderBand(nowUTC: Date, tz: string, hour: number): boolean {
  const off = tzOffsetMinutes(tz, nowUTC);
  // Instant cible = heure locale `hour`:30. On construit l'horloge locale
  // (now + offset), on fixe l'heure cible, puis on revient en UTC (-offset).
  const wall = new Date(nowUTC.getTime() + off * 60000); // horloge locale du user
  wall.setUTCHours(hour, MINUTE_OF_HOUR, 0, 0);
  const target = new Date(wall.getTime() - off * 60000); // retour en UTC réel
  // Confort aux fuseaux > UTC+12 quand minuit passe localement pendant le shift :
  // la date locale du « shifted » peut avoir glissé d'un jour. Min sur -24h/+24h.
  const DAY = 24 * 60 * 60 * 1000;
  let best = Infinity;
  for (const k of [-1, 0, 1]) {
    const d = Math.abs(nowUTC.getTime() - (target.getTime() + k * DAY)) / 60000;
    if (d < best) best = d;
  }
  return best <= BAND_TOLERANCE_MIN;
}

// Anti-doublon : un rappel a-t-il déjà été envoyé sur ce créneau local ?
// (Compare la date locale du dernier envoi à la date locale courante.)
export function alreadySentToday(lastSent: Date | null, tz: string, nowUTC: Date): boolean {
  if (!lastSent) return false;
  return localDayKey(tz, lastSent) === localDayKey(tz, nowUTC);
}

// Augure à notifier ? dueAt (instant UTC) tombe le jour local `dayKey`.
export function dueOnLocalDay(dueAt: Date, tz: string, dayKey: string): boolean {
  return localDayKey(tz, dueAt) === dayKey;
}
