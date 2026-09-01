'use client';

// components/auth-gate.tsx
// Enveloppe qui exige un compte VÉRIFIÉ pour afficher ses enfants.
// S'utilise autour du contenu d'une page d'univers / sous-page (serveur OU client).
// Le mécanisme de crédits (useEntitlement / API entitlement) reste intact : il
// opère dans les enfants, UNE FOIS le gate "compte vérifié" passé.
import type { ReactNode } from 'react';
import { useRequireVerified, VerifiedGate } from './verified-gate';

export default function AuthGate({ children }: { children: ReactNode }) {
  const auth = useRequireVerified();
  if (auth !== 'ok') return <VerifiedGate state={auth} />;
  return <>{children}</>;
}
