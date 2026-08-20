import { NextRequest, NextResponse } from 'next/server';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

// ── Vidéos d'attente Tarot : détection dynamique ──────────────────────────
// Toutes les vidéos "analyse-tarotX.mp4" (X = 1..9) présentes dans
// public/images sont intégrées automatiquement à la rotation. Ajouter une
// nouvelle vidéo = la déposer dans public/images, rien d'autre à changer.
// L'ordre est MÉLANGÉ à chaque appel : chaque visite démarre par une vidéo
// différente (la 1ère jouée n'est pas toujours analyse-tarot1.mp4).
function listTarotVideos(): string[] {
  const dir = join(process.cwd(), 'public', 'images');
  const out: string[] = [];
  try {
    const files = readdirSync(dir);
    for (let n = 1; n <= 9; n++) {
      if (files.includes(`analyse-tarot${n}.mp4`)) {
        out.push(`/images/analyse-tarot${n}.mp4`);
      }
    }
  } catch {
    // En cas d'accès FS impossible (prod serverless), on retombe sur la liste
    // statique connue.
    for (let n = 1; n <= 9; n++) {
      if (existsSync(join(dir, `analyse-tarot${n}.mp4`))) {
        out.push(`/images/analyse-tarot${n}.mp4`);
      }
    }
  }
  if (out.length === 0) return ['/images/analyse-tarot1.mp4'];
  // Fisher-Yates : mélange aléatoire de l'ordre des vidéos à chaque appel.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ── Vidéos d'attente Runes : détection dynamique ─────────────────────────
// Toutes les vidéos "analyse-runesX.mp4" (X = 1..9) présentes dans
// public/images. Mélangées à chaque appel → vidéo aléatoire à chaque tirage.
function listRuneVideos(): string[] {
  const dir = join(process.cwd(), 'public', 'images');
  const out: string[] = [];
  try {
    const files = readdirSync(dir);
    for (let n = 1; n <= 9; n++) {
      if (files.includes(`analyse-runes${n}.mp4`)) {
        out.push(`/images/analyse-runes${n}.mp4`);
      }
    }
  } catch {
    for (let n = 1; n <= 9; n++) {
      if (existsSync(join(dir, `analyse-runes${n}.mp4`))) {
        out.push(`/images/analyse-runes${n}.mp4`);
      }
    }
  }
  if (out.length === 0) return [];
  // Fisher-Yates : mélange aléatoire à chaque appel.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Config d'attente par type de tirage.
// La vidéo chargement-yi-jing.mp4 est prioritaire : elle joue en entier (pas de loop),
// puis un fondu au noir laisse place a l'overlay classique (spinner + messages).
// Pour yi-jing-question : video1 puis video2 (5s apres la fin de la 1ere).
// Pour les tirages tarot : rotation automatique des vidéos analyse-tarotX.mp4.
const CONFIG: Record<string, {
  messages: { fr: string[]; en: string[] };
  backgroundType: 'image' | 'video' | 'none';
  backgroundUrls: string[];
  animation: string;
  minDurationMs: number;
  videoNoLoop?: boolean;
}> = {
  'yi-jing-simple': {
    messages: {
      fr: ['L’oracle consulte les hexagrammes…', 'Les baguettes d’achillée résonnent…', 'Le Yi Jing médite votre tirage…'],
      en: ['The oracle consults the hexagrams…', 'The yarrow stalks resonate…', 'The I Ching ponders your draw…'],
    },
    backgroundType: 'video',
    backgroundUrls: ['/backgrounds/chargement-yi-jing.mp4'],
    animation: 'fade',
    minDurationMs: 3500,
    videoNoLoop: true,
  },
  'yi-jing-question': {
    messages: {
      fr: ['L’oracle consulte les hexagrammes…', 'Les baguettes d’achillée résonnent…', 'Le Yi Jing médite votre question…'],
      en: ['The oracle consults the hexagrams…', 'The yarrow stalks resonate…', 'The I Ching ponders your question…'],
    },
    backgroundType: 'video',
    backgroundUrls: ['/backgrounds/chargement-yi-jing.mp4', '/backgrounds/chargement-yi-jing2.mp4'],
    animation: 'fade',
    minDurationMs: 3500,
    videoNoLoop: true,
  },
  'yi-qing': {
    messages: {
      fr: ['L’oracle consulte les hexagrammes…', 'Le Yi Jing révèle sa sagesse…'],
      en: ['The oracle consults the hexagrams…', 'The I Ching reveals its wisdom…'],
    },
    backgroundType: 'video',
    backgroundUrls: ['/backgrounds/chargement-yi-jing.mp4'],
    animation: 'fade',
    minDurationMs: 3500,
    videoNoLoop: true,
  },
  // ── Tirages de Tarot : rotation automatique des vidéos analyse-tarotX.mp4 ──
  // NOTE : backgroundUrls est laissé vide ici — il est généré à CHAQUE requête
  // dans GET() via listTarotVideos() (mélange aléatoire à chaque visite).
  'tarot-3-cartes': {
    messages: {
      fr: ['Les cartes se dévoilent…', 'Le tarot médite votre tirage…', 'L’oracle assemble les arcanes…'],
      en: ['The cards reveal themselves…', 'The tarot ponders your spread…', 'The oracle weaves the arcana…'],
    },
    backgroundType: 'video',
    backgroundUrls: [],
    animation: 'fade',
    minDurationMs: 3500,
    videoNoLoop: true,
  },
  'tarot-5-cartes': {
    messages: {
      fr: ['La croix se dessine…', 'Le tarot médite votre tirage…', 'L’oracle assemble les arcanes…'],
      en: ['The cross takes shape…', 'The tarot ponders your spread…', 'The oracle weaves the arcana…'],
    },
    backgroundType: 'video',
    backgroundUrls: [],
    animation: 'fade',
    minDurationMs: 3500,
    videoNoLoop: true,
  },
  'tarot-5-c-manuelle': {
    messages: {
      fr: ['Vos cartes se révèlent…', 'Le tarot médite votre tirage…', 'L’oracle assemble les arcanes…'],
      en: ['Your cards reveal themselves…', 'The tarot ponders your spread…', 'The oracle weaves the arcana…'],
    },
    backgroundType: 'video',
    backgroundUrls: [],
    animation: 'fade',
    minDurationMs: 3500,
    videoNoLoop: true,
  },
  // ── Runes : vidéos d'attente analyse-runesX.mp4 (générées à la requête) ──
  'runes': {
    messages: {
      fr: ['L’Oracle déchiffre les runes…', 'Les runes murmurent leur sagesse…', 'Les Nornes tissent le fil…'],
      en: ['The Oracle deciphers the runes…', 'The runes whisper their wisdom…', 'The Norns weave the thread…'],
    },
    backgroundType: 'video',
    backgroundUrls: [],
    animation: 'fade',
    minDurationMs: 3500,
    videoNoLoop: true,
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || '';
  const lang = searchParams.get('lang') === 'en' ? 'en' : 'fr';
  const cfg = CONFIG[type];

  if (!cfg) {
    // Fallback generique
    return NextResponse.json({
      messages: [lang === 'en' ? 'Loading the interpretation…' : 'Chargement de l’interprétation…'],
      backgroundType: 'none',
      backgroundUrls: [],
      animation: 'fade',
      minDurationMs: 2500,
    });
  }

  // Vidéos d'attente : mélange aléatoire à CHAQUE requête (ordre différent à
  // chaque visite). Tarot = analyse-tarotX.mp4, runes = analyse-runesX.mp4.
  const backgroundUrls =
    type.startsWith('tarot') ? listTarotVideos()
    : type.startsWith('runes') ? listRuneVideos()
    : cfg.backgroundUrls;

  return NextResponse.json({
    messages: cfg.messages[lang],
    backgroundType: cfg.backgroundType,
    backgroundUrls,
    animation: cfg.animation,
    minDurationMs: cfg.minDurationMs,
    videoNoLoop: cfg.videoNoLoop ?? false,
  });
}
