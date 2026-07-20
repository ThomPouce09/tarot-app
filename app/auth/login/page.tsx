'use client';

// app/auth/login/page.tsx
// Redirige vers la mire de connexion unifiee (/login, style (1)).
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/login');
  }, [router]);
  return null;
}
