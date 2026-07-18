'use client';

// components/astro-dice/AstroDiceDemo.tsx
//
// Exemple d'intégration de <AstroDiceSet/> — bouton "Lancer les dés",
// tirage aléatoire, et affichage du résultat une fois les dés immobilisés.
// À adapter dans la future page /des-divinatoires.

import { useCallback, useState } from 'react';
import AstroDiceSet from './AstroDiceSet';
import { randomTargetFaces, type TargetFaces } from './glyphs';

export default function AstroDiceDemo() {
  const [isRolling, setIsRolling] = useState(false);
  const [target, setTarget] = useState<TargetFaces>(() => randomTargetFaces());
  const [result, setResult] = useState<TargetFaces | null>(null);

  const roll = useCallback(() => {
    if (isRolling) return;
    setResult(null);
    setTarget(randomTargetFaces()); // nouveau tirage
    // Laisse React committer la nouvelle cible avant de lancer l'anim.
    requestAnimationFrame(() => setIsRolling(true));
  }, [isRolling]);

  const handleRest = useCallback((faces: TargetFaces) => {
    setIsRolling(false);
    setResult(faces);
  }, []);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
      <AstroDiceSet
        isRolling={isRolling}
        targetFaces={target}
        onRest={handleRest}
        height={440}
        // font="/fonts/Symbola.woff"  // ← recommandé pour les glyphes astro
      />

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button
          onClick={roll}
          disabled={isRolling}
          style={{
            padding: '10px 24px',
            fontSize: 16,
            borderRadius: 10,
            border: '1px solid #DAA520',
            background: isRolling ? '#6E271E' : '#9B3A2E',
            color: '#F3E4C4',
            cursor: isRolling ? 'default' : 'pointer',
          }}
        >
          {isRolling ? 'Les dés roulent…' : 'Lancer les dés'}
        </button>
      </div>

      {result && (
        <p style={{ textAlign: 'center', marginTop: 14, color: '#F3E4C4' }}>
          Planète <b>{result.planet}</b> · Signe <b>{result.sign}</b> · Maison{' '}
          <b>{result.house}</b>
        </p>
      )}
    </div>
  );
}
