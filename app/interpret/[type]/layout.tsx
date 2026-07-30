// Layout pour /interpret/[type]
// Fournit generateStaticParams pour la static export (APK build)
// La page elle-même est 'use client' — les params sont gérés ici

export function generateStaticParams() {
  const hexagrams = Array.from({ length: 64 }, (_, i) => `hexagram-${i + 1}`);
  const others = [
    'yi-jing-simple', 'yi-jing-question', 'tarot-3-cartes', 'tarot-5-cartes',
    'tarot-5-c-manuelle', 'runes', 'des-choix',
    'obstacle-solution', 'affinage', 'yi-jing-du-jour',
  ];
  return [...hexagrams, ...others].map((type) => ({ type }));
}

export default function InterpretLayout({ children }: { children: React.ReactNode }) {
  return children;
}
