'use client';

// components/starry-night.tsx
//
// Nuit étoilée animée — fond pour les pages Dés du Zodiaque.
// Canvas 2D léger (rAF, zéro dépendance) :
//   • dégradé bleu nuit profond (radial, très sombre sur les bords)
//   • ~180 étoiles fixes qui SCINTILLENT lentement (sinusoïde lente,
//     amplitudes et phases aléatoires → certaines fortes, certaines
//     à peine visibles, rythme très lent)
//   • comètes / étoiles filantes RARES et discrètes : trajectoire
//     aléatoire, traînée lumineuse + poussières étoilées qui se
//     dispersent, espacement aléatoire (6 à 18 s)
// Respecte prefers-reduced-motion (fige le scintillement).
// Doit être rendu en position absolute inset-0 pointer-events-none.

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  r: number;          // rayon en px
  phase: number;      // décalage sinusoïdal
  speed: number;      // vitesse de scintillement (rad/s) — LENT
  amp: number;        // amplitude 0..1 (certaines fortes, d'autres faibles)
  base: number;       // opacité de base
  hue: string;        // couleur (blanc pur / blanc bleuté / or pâle)
  glow: boolean;      // halo doux pour les grosses étoiles
}

interface Comet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;       // 0..1 (1 = naissance, 0 = disparition)
  maxLife: number;    // durée totale en s
  dust: { x: number; y: number; vx: number; vy: number; r: number; a: number }[];
  hue: string;
}

const DEFAULT_DENSITY = 180;
const DEFAULT_INTERVAL: [number, number] = [6, 18];

/** Variantes de nuit étoilée : blue (défaut, /choix), gold (/affinage),
 *  silver (/obstacle-solution). Chaque variante ajuste les teintes des
 *  étoiles, le voile de fond et ajoute éventuellement une lune discrète. */
export type StarryVariant = 'blue' | 'gold' | 'silver';

interface StarryTheme {
  night: string[];
  dawn: string[];
  stars: string[];
  comets: string[];
  veil: [number, number, number]; // rgb du voile respirant
  moon: { color: string; halo: string; x: number; y: number; r: number } | null;
}

const THEMES: Record<StarryVariant, StarryTheme> = {
  blue: {
    night: ['#071631', '#050e24', '#030818', '#020510', '#010307'],
    dawn: ['#0c1f40', '#071430', '#040b1e', '#02060f', '#010204'],
    stars: ['#ffffff', '#dbe7ff', '#f4ecd8', '#ffe9c4', '#cfe0ff'],
    comets: ['#ffffff', '#dbe7ff', '#fdf6d8'],
    veil: [70, 120, 200],
    moon: null,
  },
  gold: {
    night: ['#0a1428', '#070f20', '#040a16', '#02060e', '#010307'],
    dawn: ['#121f38', '#0b1629', '#060f1e', '#030812', '#010204'],
    stars: ['#fff4d6', '#ffe9b8', '#f5d78a', '#e8c66a', '#ffffff'],
    comets: ['#ffe9b8', '#f5d78a', '#fffdf2'],
    veil: [200, 160, 80],
    moon: { color: '#f5d78a', halo: '200, 170, 100', x: 0.8, y: 0.18, r: 0.05 },
  },
  silver: {
    night: ['#0a1126', '#070d1d', '#040814', '#02040c', '#010205'],
    dawn: ['#101c38', '#0a1329', '#060c1c', '#030611', '#010204'],
    stars: ['#ffffff', '#e8eef7', '#d5dfef', '#c2d0e6', '#f0f4fa'],
    comets: ['#ffffff', '#e8eef7', '#dfe8f5'],
    veil: [150, 170, 210],
    moon: { color: '#e8eef7', halo: '190, 200, 225', x: 0.2, y: 0.18, r: 0.05 },
  },
};

export default function StarryNight({
  density = DEFAULT_DENSITY,
  cometInterval = DEFAULT_INTERVAL,
  variant = 'blue',
}: {
  /** Nombre d'étoiles fixes (~180 par défaut) */
  density?: number;
  /** Intervalle aléatoire entre deux comètes, en secondes */
  cometInterval?: [number, number];
  /** Variante de thème : blue (défaut), gold, silver */
  variant?: StarryVariant;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Alias non-null pour les closures (narrowing TS).
    const cv = canvas;
    const c2d = ctx;
    const theme = THEMES[variant];

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let running = true;

    const stars: Star[] = [];
    const comets: Comet[] = [];
    let nextCometAt = performance.now() + randMs(cometInterval);

    function randMs([min, max]: [number, number]) {
      return (min + Math.random() * (max - min)) * 1000;
    }
    function rand(min: number, max: number) {
      return min + Math.random() * (max - min);
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.offsetWidth;
      h = cv.offsetHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
    }

    function buildStars() {
      stars.length = 0;
      for (let i = 0; i < density; i++) {
        const big = Math.random() < 0.1; // ~10% d'étoiles un peu plus visibles
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: big ? rand(1.2, 2.1) : rand(0.45, 1.15),
          phase: Math.random() * Math.PI * 2,
          speed: rand(0.12, 0.45),        // rad/s → cycle de 14 à 52 s : TRÈS lent
          amp: big ? rand(0.6, 1) : rand(0.3, 0.9),
          base: big ? rand(0.8, 1) : rand(0.4, 0.85),
          hue: theme.stars[Math.floor(Math.random() * theme.stars.length)],
          glow: big && Math.random() < 0.7,
        });
      }
    }

    function spawnComet() {
      // Trajectoire aléatoire : part d'un bord, angle variable
      const fromLeft = Math.random() < 0.5;
      const y0 = rand(0.05, 0.6) * h;
      const speed = rand(260, 520); // px/s
      const angle = rand(-0.35, 0.35) + (fromLeft ? 0 : Math.PI); // balayage horizontal léger
      const x0 = fromLeft ? -40 : w + 40;
      const life = rand(1.4, 2.6);
      const hue = theme.comets[Math.floor(Math.random() * theme.comets.length)];
      comets.push({
        x: x0,
        y: y0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * rand(0.15, 0.5),
        life: 1,
        maxLife: life,
        dust: [],
        hue,
      });
    }

    /** Interpole deux couleurs hex (#rrggbb) par un facteur 0..1. */
    function lerpHex(a: string, b: string, t: number): string {
      const pa = parseInt(a.slice(1), 16);
      const pb = parseInt(b.slice(1), 16);
      const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
      const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
      const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
      return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
    }

    function drawBackground(t: number) {
      // Deux palettes : profonde (bas) et aube naissante (haut).
      // Interpolation très lente (cycle ~2 min) : le ciel "respire" vers
      // l'aube puis revient — toujours sur des teintes sombres.
      const dawn = 0.5 + 0.5 * Math.sin(t * 0.000052); // 0..1, cycle ≈ 120 s
      const NIGHT = theme.night;
      const DAWN = theme.dawn;
      const c = (i: number) => lerpHex(NIGHT[i], DAWN[i], dawn);

      // Dégradé nuit : plus lumineux en haut, quasi-noir en bas
      const g = c2d.createRadialGradient(w * 0.5, h * 0.1, 0, w * 0.5, h * 0.55, Math.max(w, h) * 0.9);
      g.addColorStop(0, c(0));
      g.addColorStop(0.35, c(1));
      g.addColorStop(0.65, c(2));
      g.addColorStop(0.88, c(3));
      g.addColorStop(1, c(4));
      c2d.fillStyle = g;
      c2d.fillRect(0, 0, w, h);

      // Voile coloré très subtil qui respire (profondeur)
      const breath = 0.5 + 0.5 * Math.sin(t * 0.00025);
      const [vr, vg2, vb] = theme.veil;
      const vg = c2d.createRadialGradient(w * 0.3, h * 0.25, 0, w * 0.3, h * 0.25, w * 0.9);
      vg.addColorStop(0, `rgba(${vr}, ${vg2}, ${vb}, ${0.05 + breath * 0.03})`);
      vg.addColorStop(1, 'rgba(0,0,0,0)');
      c2d.fillStyle = vg;
      c2d.fillRect(0, 0, w, h);
    }

    /** Lune discrète (variantes gold/silver) : halo doux + disque + cratères
     *  très légers. Positionnée en haut, côté opposé au contenu principal. */
    function drawMoon(t: number) {
      const m = theme.moon;
      if (!m) return;
      const mx = w * m.x;
      const my = h * m.y;
      const mr = Math.min(w, h) * m.r;

      // Respiration très lente du halo
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.0002);

      // Halo large et doux
      const halo = c2d.createRadialGradient(mx, my, mr * 0.4, mx, my, mr * 4);
      halo.addColorStop(0, `rgba(${m.halo}, ${0.16 + pulse * 0.06})`);
      halo.addColorStop(0.5, `rgba(${m.halo}, ${0.05 + pulse * 0.03})`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      c2d.fillStyle = halo;
      c2d.beginPath();
      c2d.arc(mx, my, mr * 4, 0, Math.PI * 2);
      c2d.fill();

      // Disque lunaire
      const body = c2d.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
      body.addColorStop(0, m.color);
      body.addColorStop(1, 'rgba(180, 180, 200, 0.55)');
      c2d.fillStyle = body;
      c2d.beginPath();
      c2d.arc(mx, my, mr, 0, Math.PI * 2);
      c2d.fill();

      // Cratères très discrets
      c2d.globalAlpha = 0.12;
      c2d.fillStyle = 'rgba(120, 120, 150, 0.8)';
      for (const [cx, cy, cr] of [
        [-0.3, -0.2, 0.18],
        [0.25, 0.15, 0.13],
        [0.05, 0.35, 0.09],
        [-0.12, 0.3, 0.07],
      ] as const) {
        c2d.beginPath();
        c2d.arc(mx + mr * cx, my + mr * cy, mr * cr, 0, Math.PI * 2);
        c2d.fill();
      }
      c2d.globalAlpha = 1;
    }

    function drawStars(t: number) {
      for (const s of stars) {
        // Scintillement sinusoïdal LENT : 0.25..1 * base selon amplitude
        const wave = 0.5 + 0.5 * Math.sin(t * 0.001 * s.speed * 6.28 + s.phase);
        const alpha = s.base * (1 - s.amp + s.amp * wave);
        if (alpha < 0.02) continue;
        c2d.globalAlpha = alpha;
        c2d.fillStyle = s.hue;
        c2d.beginPath();
        c2d.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        c2d.fill();
        if (s.glow) {
          c2d.globalAlpha = alpha * 0.22;
          c2d.beginPath();
          c2d.arc(s.x, s.y, s.r * 3.2, 0, Math.PI * 2);
          c2d.fill();
        }
      }
      c2d.globalAlpha = 1;
    }

    function drawComets(dt: number) {
      for (let i = comets.length - 1; i >= 0; i--) {
        const c = comets[i];
        c.life -= dt / c.maxLife;
        if (c.life <= 0) {
          comets.splice(i, 1);
          continue;
        }
        // Avance
        c.x += c.vx * dt;
        c.y += c.vy * dt;

        // Poussières étoilées : émission pendant la vie de la comète
        if (Math.random() < 0.6) {
          c.dust.push({
            x: c.x - c.vx * 0.02,
            y: c.y - c.vy * 0.02,
            vx: c.vx * rand(-0.25, 0.1) + rand(-12, 12),
            vy: c.vy * rand(-0.25, 0.1) + rand(-12, 12),
            r: rand(0.4, 1.1),
            a: 1,
          });
        }
        // Vieillissement des poussières
        for (let j = c.dust.length - 1; j >= 0; j--) {
          const d = c.dust[j];
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          d.a -= dt * 1.6;
          if (d.a <= 0) c.dust.splice(j, 1);
        }
        if (c.dust.length > 60) c.dust.splice(0, c.dust.length - 60);

        const fadeIn = Math.min(1, (1 - c.life) * 8); // attaque douce
        const fadeOut = Math.min(1, c.life * 3);      // disparition douce
        const alpha = fadeIn * fadeOut;

        // Traînée (ligne dégradée derrière la tête)
        const tailX = c.x - c.vx * 0.16;
        const tailY = c.y - c.vy * 0.16;
        const tg = c2d.createLinearGradient(c.x, c.y, tailX, tailY);
        tg.addColorStop(0, `rgba(255,255,255,${0.9 * alpha})`);
        tg.addColorStop(1, 'rgba(255,255,255,0)');
        c2d.strokeStyle = tg;
        c2d.lineWidth = 1.6;
        c2d.lineCap = 'round';
        c2d.beginPath();
        c2d.moveTo(c.x, c.y);
        c2d.lineTo(tailX, tailY);
        c2d.stroke();

        // Tête lumineuse
        c2d.globalAlpha = alpha;
        c2d.fillStyle = c.hue;
        c2d.beginPath();
        c2d.arc(c.x, c.y, 1.7, 0, Math.PI * 2);
        c2d.fill();
        c2d.globalAlpha = alpha * 0.3;
        c2d.beginPath();
        c2d.arc(c.x, c.y, 4.2, 0, Math.PI * 2);
        c2d.fill();
        c2d.globalAlpha = 1;

        // Poussières
        for (const d of c.dust) {
          c2d.globalAlpha = Math.max(0, d.a) * alpha * 0.7;
          c2d.fillStyle = c.hue;
          c2d.beginPath();
          c2d.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          c2d.fill();
        }
        c2d.globalAlpha = 1;
      }
    }

    let last = performance.now();
    function frame(now: number) {
      if (!running) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = now;

      drawBackground(t);
      drawMoon(t);
      if (reduced) {
        drawStars(0); // scintillement figé
      } else {
        drawStars(t);
        drawComets(dt);
        if (now >= nextCometAt) {
          spawnComet();
          nextCometAt = now + randMs(cometInterval);
        }
      }
      raf = requestAnimationFrame(frame);
    }

    resize();
    raf = requestAnimationFrame(frame);

    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [density, cometInterval, variant]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}
