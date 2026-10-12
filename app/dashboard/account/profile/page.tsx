'use client';

// L'ancien chemin direct de la page « Profil oracle » : le formulaire vit
// désormais SOUS le formulaire d'Informations personnelles de /dashboard/account
// (la barre de navigation mobile était déjà saturée). Ce chemin reste valide
// et y ramène automatiquement.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/account'); }, [router]);
  return null;
}
