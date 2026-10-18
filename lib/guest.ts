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

import { prisma } from '@/lib/prisma';

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

/** Activer/querir le mode Invité. Renvoie l'état après bascule. */
export async function setGuestMode(email: string, on: boolean): Promise<boolean> {
  const e = (email || '').trim().toLowerCase();
  const u = await prisma.user.findUnique({ where: { email: e }, select: { id: true } });
  if (!u) throw new Error('user-not-found');
  await prisma.user.update({ where: { id: u.id }, data: { guestMode: !!on } });
  return !!on;
}
