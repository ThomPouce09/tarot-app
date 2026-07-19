'use client';

// app/des-divinatoires/cup/page.tsx
// Page de test (hors charte) du composant <AstroDiceCup/> : gobelet zénithal +
// secousse + bascule vers le haut pour faire "tomber" les 3 dés dans l'arène.

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { randomTargetFaces, type TargetFaces } from '@/components/astro-dice/glyphs';

const AstroDiceCup = dynamic(
  () => import('@/components/astro-dice/AstroDiceCup').then((m) => m.default),
  { ssr: false },
);

export default function CupTest() {
  const [faces, setFaces] = useState<TargetFaces>(() => randomTargetFaces());
  const [result, setResult] = useState<TargetFaces | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  // Le wrapper pilote le lancer en interne (secousse → renversement). Il
  // remonte le résultat via onRest une fois les dés immobilisés.
  const handleRest = useCallback((f: TargetFaces) => {
    setResult(f);
  }, []);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0a0710',
        color: '#f3e4c4',
        fontFamily: 'system-ui, sans-serif',
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>AstroDiceCup — test</h1>

      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <AstroDiceCup
          key={resetSignal}
          targetFaces={faces}
          skin="moon"
          height={460}
          onRest={handleRest}
          resetSignal={resetSignal}
        />
      </div>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button
          onClick={() => {
            setResult(null);
            setFaces(randomTargetFaces());
            setResetSignal((n) => n + 1);
          }}
          style={{
            padding: '10px 20px',
            borderRadius: 10,
            border: 'none',
            background: '#9B3A2E',
            color: '#f3e4c4',
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Nouveau tirage
        </button>
      </div>

      {result && (
        <p style={{ textAlign: 'center', marginTop: 14 }}>
          Planète <b>{result.planet}</b> · Signe <b>{result.sign}</b> · Maison{' '}
          <b>{result.house}</b>
        </p>
      )}
    </main>
  );
}
