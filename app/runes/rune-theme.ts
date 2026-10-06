// Étincelles dorées de la révélation du Conseil d'Odin (positions/délais
// déterministes — pas de random pendant le rendu).
export const SPARKS: {
  x: string;
  y: string;
  rise: number;
  size: number;
  delay: number;
  dur: number;
  spin: number;
  color: string;
  char: string;
}[] = [
  { x: '8%', y: '38%', rise: 90, size: 13, delay: 0.1, dur: 0.3, spin: 40, color: '#FFE9A8', char: '✦' },
  { x: '16%', y: '58%', rise: 70, size: 9, delay: 0.45, dur: 0.2, spin: -30, color: '#FFF3CF', char: '✧' },
  { x: '24%', y: '30%', rise: 110, size: 12, delay: 0.25, dur: 0.4, spin: 60, color: '#FFD97A', char: '✦' },
  { x: '37%', y: '64%', rise: 80, size: 10, delay: 0.65, dur: 0.15, spin: -50, color: '#FFF0C2', char: '✧' },
  { x: '48%', y: '22%', rise: 120, size: 14, delay: 0.15, dur: 0.5, spin: 25, color: '#FFE9A8', char: '✦' },
  { x: '58%', y: '60%', rise: 75, size: 9, delay: 0.5, dur: 0.2, spin: -40, color: '#FFF9E0', char: '✧' },
  { x: '66%', y: '34%', rise: 100, size: 12, delay: 0.35, dur: 0.35, spin: 45, color: '#FFD97A', char: '✦' },
  { x: '76%', y: '55%', rise: 85, size: 10, delay: 0.7, dur: 0.2, spin: -60, color: '#FFEFC0', char: '✧' },
  { x: '86%', y: '40%', rise: 95, size: 13, delay: 0.2, dur: 0.45, spin: 35, color: '#FFE9A8', char: '✦' },
  { x: '93%', y: '62%', rise: 70, size: 9, delay: 0.55, dur: 0.25, spin: -25, color: '#FFF3CF', char: '✧' },
  { x: '30%', y: '80%', rise: 65, size: 11, delay: 0.8, dur: 0.3, spin: 30, color: '#FFE0A0', char: '✦' },
  { x: '70%', y: '84%', rise: 60, size: 10, delay: 0.9, dur: 0.25, spin: -35, color: '#FFF9E0', char: '✧' },
];

/* Palette centralisée */
export const RUNE_THEME = {
  forestDeep: '#0c2417', // vert forêt très profond (fond principal)
  forest: '#14361f', // vert sapin
  forestMid: '#1f5234', // vert sapin moyen
  sage: '#9fc4ad', // vert sauge clair (texte secondaire)
  sagePale: '#cfe3d6', // vert sauge très clair (illustration)
  goldPale: '#e9d9ac', // doré pâle / beige sable (titres, bordures)
  goldSoft: '#d8c79a', // doré un peu plus soutenu
  goldGlow: '#e9d9ac66',
  ink: '#0a1c11',
  stone: '#b9d4c4',
} as const;
