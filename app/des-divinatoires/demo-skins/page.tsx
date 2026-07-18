'use client';

// app/des-divinatoires/_demo-skins/page.tsx
// Page de test (hors charte) pour prévisualiser les skins du composant
// <AstroDiceSet/> : bac bleu nuit + étoiles (moon), et autres variantes.

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { randomTargetFaces, type TargetFaces } from '@/components/astro-dice/glyphs';

const AstroDiceSet = dynamic(
  () => import('@/components/astro-dice/AstroDiceSet').then((m) => m.default),
  { ssr: false },
);

const SKINS = ['classic', 'moon', 'onyx', 'ivory', 'emerald'] as const;

export default function SkinsDemo() {
  const [skin, setSkin] = useState<(typeof SKINS)[number]>('moon');
  const [rolling, setRolling] = useState(false);
  const [faces, setFaces] = useState<TargetFaces>(() => randomTargetFaces());

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
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Skins — AstroDiceSet</h1>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {SKINS.map((s) => (
          <button
            key={s}
            onClick={() => setSkin(s)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: skin === s ? '2px solid #DAA520' : '1px solid #6E271E',
              background: skin === s ? '#9B3A2E' : '#1a0e0a',
              color: '#f3e4c4',
              cursor: 'pointer',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <AstroDiceSet
          isRolling={rolling}
          targetFaces={faces}
          skin={skin}
          height={440}
        />
      </div>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button
          onClick={() => {
            setFaces(randomTargetFaces());
            setRolling(true);
            setTimeout(() => setRolling(false), 3000);
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
          Lancer les trois dés
        </button>
      </div>
    </main>
  );
}
