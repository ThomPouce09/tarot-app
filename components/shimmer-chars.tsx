import { CSSProperties } from 'react';

// Rend le texte en spans, allume la lettre a l'index `col` avec un style doré vif
// (meme effet que BrandTitle). `color` = couleur de base des lettres inactives.
export function ShimmerChars({
  text,
  col,
  color,
  activeColor = '#FFFBE6',
}: {
  text: string;
  col: number;
  color: string;
  activeColor?: string;
}) {
  const chars = text.split('');
  return (
    <>
      {chars.map((ch, i) => {
        const active = col === i;
        const style: CSSProperties = active
          ? {
              color: activeColor,
              fontWeight: 800,
              textShadow:
                '0 0 16px rgba(255,235,150,1), 0 0 32px rgba(255,200,60,0.95)',
            }
          : { color };
        return (
          <span
            key={i}
            aria-hidden
            className="transition-[color,text-shadow,opacity,transform] duration-200"
            style={style}
          >
            {ch}
          </span>
        );
      })}
    </>
  );
}
