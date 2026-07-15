import { NextRequest, NextResponse } from 'next/server';

// Config d'attente par type de tirage.
// La vidéo chargement-yi-jing.mp4 est prioritaire : elle joue en entier (pas de loop),
// puis un fondu au noir laisse place a l'overlay classique (spinner + messages).
// Pour yi-jing-question : video1 puis video2 (5s apres la fin de la 1ere).
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

  return NextResponse.json({
    messages: cfg.messages[lang],
    backgroundType: cfg.backgroundType,
    backgroundUrls: cfg.backgroundUrls,
    animation: cfg.animation,
    minDurationMs: cfg.minDurationMs,
    videoNoLoop: cfg.videoNoLoop ?? false,
  });
}
