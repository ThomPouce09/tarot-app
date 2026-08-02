// lib/race-guard.ts
// Compteur global anti-course pour les analyses LLM.
//
// Pourquoi un compteur GLOBAL et pas un useRef local ?
//   - useRef(0) repart de zéro quand le composant est démonté puis remonté
//     (restart, nouveau tirage) → une réponse tardive de l'ancienne instance
//     aurait le MÊME seq et écraserait la nouvelle réponse.
//   - Un compteur module-level ne fait que croître → chaque lancement est
//     identifié de façon unique, même à travers les remontages.
//
// Usage :
//   const seq = nextRaceSeq();          // prend un numéro unique
//   ... await fetch(...) ...
//   if (seq !== lastAppliedRef.current) return; // réponse obsolète → ignorer
//   lastAppliedRef.current = seq;                // appliquer
let globalSeq = 0;

export function nextRaceSeq(): number {
  globalSeq += 1;
  return globalSeq;
}
