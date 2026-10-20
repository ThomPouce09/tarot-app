// lib/guest.ts — Mode Invité : prêter un tirage à quelqu'un (proche, enfant,
// collègue) sans jamais exposer le compte hôte.
//
// Règles (produit) :
//  • Le flag vit CÔTÉ SERVEUR (User.guestMode) — jamais spoofable par le client.
//  • Les tirages invités sont débités du compte hôte exactement comme d'habitude.
//  • Le prompt IA est identique MAIS sans aucune donnée personnelle : toutes les
//    injections de profil passent par buildProfileBlock(email) — qui renvoie ''
//    si le compte est en mode Invité (point d'injection unique, 100 % couvert).
//  • Rien n'est enregistré : pas de Reading (historique/stats/vitrine muets) et
//    l'augure (Echo) est refusé serveur.
//  • Les tirages rattachés au compte (hexagramme du jour, roue hebdo, double)
//    restent autorisés et mémorisés au profit de l'invité : le jour est consommé.
//  • Un compteur mensuel (Usage.guestUsedMonth) rappelle à l'hôte, page
//    Abonnement, combien de tirages ont été prêtés ce mois-ci.
//
// VERROU 4 CHIFFRES (option A — 2026-10-20) :
//  • Le code de retour au mode normal vit en base, haché bcrypt (guestPinHash)
//    — jamais en clair, jamais sur le téléphone.
//  • Il est EXIGÉ à l'activation du mode (l'hôte pose son code devant lui) et
//    à chaque désactivation. Un compte legacy déjà invité sans code peut sortir
//    sans code (rétrocompatibilité ; le code sera exigé à la prochaine
//    activation).
//  • Anti-force : 5 échecs consécutifs → verrou de 15 minutes (côté serveur).
//  • Oubli : « Code oublié ? » envoie un e-mail de réinitialisation ; le lien
//    vide le code ET coupe le mode Invité (la personne qui a accès à la boîte
//    mail est le propriétaire du compte).
//  • Gestion (changer / retirer) : Préférences, uniquement en mode normal.

import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

const PIN_RE = /^\d{4}$/;
const MAX_TRIES = 5;
const LOCK_MS = 15 * 60 * 1000;

export type GuestPinResult =
  | { ok: true }
  | { ok: false; code: 'pin-required' | 'pin-wrong' | 'pin-locked' | 'pin-format' | 'pin-already-set' | 'pin-not-set'; lockedUntil?: number };

export async function isGuestMode(email: string | null | undefined): Promise<boolean> {
  const e = (email || '').trim().toLowerCase();
  if (!e) return false;
  try {
    const u = await prisma.user.findUnique({ where: { email: e }, select: { guestMode: true } });
    return !!u?.guestMode;
  } catch {
    return false; // base indisponible : on ne bloque pas, le mode normal est le repli sûr
  }
}

/** État serveur complet du mode Invité (banner + cache client). */
export async function guestStatus(email: string): Promise<{ guestMode: boolean; hasPin: boolean }> {
  const e = (email || '').trim().toLowerCase();
  if (!e) return { guestMode: false, hasPin: false };
  try {
    const u = await prisma.user.findUnique({ where: { email: e }, select: { guestMode: true, guestPinHash: true } });
    return { guestMode: !!u?.guestMode, hasPin: !!u?.guestPinHash };
  } catch {
    return { guestMode: false, hasPin: false };
  }
}

/** Activer le mode Invité. Exige un code 4 chiffres (hashé en base).
 *  Renvoie false si le compte est introuvable ; lève sur erreur DB. */
export async function setGuestMode(email: string, on: boolean, pin?: string | null): Promise<boolean> {
  const e = (email || '').trim().toLowerCase();
  const u = await prisma.user.findUnique({ where: { email: e }, select: { id: true, guestPinHash: true } });
  if (!u) throw new Error('user-not-found');
  if (on) {
    // Activation : le code est obligatoire (option A validée par l'utilisateur).
    if (!u.guestPinHash) {
      if (!pin || !PIN_RE.test(pin)) throw new Error('pin-required');
      const hash = await (bcrypt as any).hash(pin, 12);
      await prisma.user.update({ where: { id: u.id }, data: { guestMode: true, guestPinHash: hash, guestPinTries: 0, guestPinLockedAt: null } });
      return true;
    }
    // Un code existe déjà : on le garde (ré-activation en douceur), le pin
    // éventuellement fourni est ignoré (changement géré par les Préférences).
    await prisma.user.update({ where: { id: u.id }, data: { guestMode: true } });
    return true;
  }
  await prisma.user.update({ where: { id: u.id }, data: { guestMode: false } });
  return false;
}

/** Vérifie le code de sortie (désactivation). Compteur d'essais + verrou 15 min.
 *  Succès → coupe guestMode et remet le compteur à zéro. */
export async function verifyPinAndExit(email: string, pin: string): Promise<GuestPinResult> {
  const e = (email || '').trim().toLowerCase();
  const u = await prisma.user.findUnique({ where: { email: e }, select: { id: true, guestPinHash: true, guestPinTries: true, guestPinLockedAt: true } });
  if (!u) return { ok: false, code: 'pin-not-set' };
  // Rétrocompatibilité : aucun code posé (compte invité legacy) → sortie libre.
  if (!u.guestPinHash) {
    await prisma.user.update({ where: { id: u.id }, data: { guestMode: false } });
    return { ok: true };
  }
  const lockedUntil = u.guestPinLockedAt ? Number(u.guestPinLockedAt) : 0;
  if (lockedUntil > Date.now()) return { ok: false, code: 'pin-locked', lockedUntil };
  if (!PIN_RE.test(String(pin || ''))) return { ok: false, code: 'pin-format' };
  const valid = await (bcrypt as any).compare(pin, u.guestPinHash);
  if (!valid) {
    const tries = (u.guestPinTries || 0) + 1;
    if (tries >= MAX_TRIES) {
      await prisma.user.update({ where: { id: u.id }, data: { guestPinTries: 0, guestPinLockedAt: BigInt(Date.now() + LOCK_MS) } });
      return { ok: false, code: 'pin-locked', lockedUntil: Date.now() + LOCK_MS };
    }
    await prisma.user.update({ where: { id: u.id }, data: { guestPinTries: tries } });
    return { ok: false, code: 'pin-wrong' };
  }
  await prisma.user.update({ where: { id: u.id }, data: { guestMode: false, guestPinTries: 0, guestPinLockedAt: null } });
  return { ok: true };
}

/** Changer / retirer le code depuis les Préférences (mode normal exigé par la route).
 *  newPin null = retirer le code (il sera redemandé à la prochaine activation). */
export async function changePin(email: string, currentPin: string | null, newPin: string | null): Promise<GuestPinResult> {
  const e = (email || '').trim().toLowerCase();
  const u = await prisma.user.findUnique({ where: { email: e }, select: { id: true, guestPinHash: true, guestMode: true } });
  if (!u) return { ok: false, code: 'pin-not-set' };
  if (u.guestMode) return { ok: false, code: 'pin-wrong' }; // garde UI (la route bloque déjà)
  if (u.guestPinHash && currentPin) {
    const valid = await (bcrypt as any).compare(String(currentPin), u.guestPinHash);
    if (!valid) return { ok: false, code: 'pin-wrong' };
  } else if (u.guestPinHash && !currentPin) {
    return { ok: false, code: 'pin-required' };
  }
  if (newPin !== null && !PIN_RE.test(newPin)) return { ok: false, code: 'pin-format' };
  const hash = newPin === null ? null : await (bcrypt as any).hash(newPin, 12);
  await prisma.user.update({ where: { id: u.id }, data: { guestPinHash: hash, guestPinTries: 0, guestPinLockedAt: null } });
  return { ok: true };
}

/** Lecture de l'état du code pour l'écran Préférences. */
export async function guestPinStatus(email: string): Promise<{ hasPin: boolean; guestMode: boolean; locked: boolean }> {
  const e = (email || '').trim().toLowerCase();
  if (!e) return { hasPin: false, guestMode: false, locked: false };
  try {
    const u = await prisma.user.findUnique({ where: { email: e }, select: { guestMode: true, guestPinHash: true, guestPinLockedAt: true } });
    return { hasPin: !!u?.guestPinHash, guestMode: !!u?.guestMode, locked: !!u?.guestPinLockedAt && Number(u.guestPinLockedAt) > Date.now() };
  } catch {
    return { hasPin: false, guestMode: false, locked: false };
  }
}
