import { NextRequest, NextResponse } from 'next/server';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

// ── Vidéos d'attente : détection dynamique par préfixe ────────────────────
// Toutes les vidéos "<prefix>X.mp4" (X = 1..9) présentes dans public/images
// sont intégrées automatiquement à la rotation. Ajouter une nouvelle vidéo =
// la déposer dans public/images, rien d'autre à changer.
// L'ordre est MÉLANGÉ à chaque appel : chaque visite démarre par une vidéo
// différente (la 1ère jouée n'est pas toujours <prefix>1.mp4).
function listVideos(prefix: string): string[] {
  const dir = join(process.cwd(), 'public', 'images');
  const out: string[] = [];
  try {
    const files = readdirSync(dir);
    for (let n = 1; n <= 9; n++) {
      if (files.includes(`${prefix}${n}.mp4`)) {
        out.push(`/images/${prefix}${n}.mp4`);
      }
    }
  } catch {
    // En cas d'accès FS impossible (prod serverless), on retombe sur la liste
    // statique connue.
    for (let n = 1; n <= 9; n++) {
      if (existsSync(join(dir, `${prefix}${n}.mp4`))) {
        out.push(`/images/${prefix}${n}.mp4`);
      }
    }
  }
  if (out.length === 0) return [`/images/${prefix}1.mp4`];
  // Fisher-Yates : mélange aléatoire de l'ordre des vidéos à chaque appel.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Raccourcis typés par univers de tirage.
function listTarotVideos(): string[] { return listVideos('analyse-tarot'); }
function listRuneVideos(): string[] { return listVideos('analyse-runes'); }
function listYiJingVideos(): string[] { return listVideos('analyse-yi-jing'); }

// Config d'attente par type de tirage.
// Pour les tirages tarot / runes / yi-jing : rotation automatique des vidéos
// analyse-tarotX.mp4 / analyse-runesX.mp4 / analyse-yi-jingX.mp4 (détectées
// dynamiquement dans public/images). backgroundUrls est laissé vide ici et
// généré à CHAQUE requête dans GET() (mélange aléatoire à chaque visite).
const CONFIG: Record<string, {
  messages: { fr: string[]; en: string[] };
  backgroundType: 'image' | 'video' | 'none';
  backgroundUrls: string[];
  animation: string;
  minDurationMs: number;
  videoNoLoop?: boolean;
  /** Noms de fichiers (basename) qui doivent se jouer UNE seule fois, sans boucle. */
  noLoopNames?: string[];
}> = {
  'yi-jing-simple': {
    messages: {
      fr: ['L’oracle consulte les hexagrammes…', 'Les baguettes d’achillée résonnent…', 'Le Yi Jing médite votre tirage…'],
      en: ['The oracle consults the hexagrams…', 'The yarrow stalks resonate…', 'The I Ching ponders your draw…'],
    },
    backgroundType: 'video',
    backgroundUrls: [],
    animation: 'fade',
    minDurationMs: 3500,
    videoNoLoop: true,
    noLoopNames: ['analyse-yi-jing1.mp4', 'analyse-yi-jing2.mp4'],
  },
  'yi-jing-question': {
    messages: {
      fr: ['L’oracle consulte les hexagrammes…', 'Les baguettes d’achillée résonnent…', 'Le Yi Jing médite votre question…'],
      en: ['The oracle consults the hexagrams…', 'The yarrow stalks resonate…', 'The I Ching ponders your question…'],
    },
    backgroundType: 'video',
    backgroundUrls: [],
    animation: 'fade',
    minDurationMs: 3500,
    videoNoLoop: true,
    noLoopNames: ['analyse-yi-jing1.mp4', 'analyse-yi-jing2.mp4'],
  },
  'yi-qing': {
    messages: {
      fr: ['L’oracle consulte les hexagrammes…', 'Le Yi Jing révèle sa sagesse…'],
      en: ['The oracle consults the hexagrams…', 'The I Ching reveals its wisdom…'],
    },
    backgroundType: 'video',
    backgroundUrls: [],
    animation: 'fade',
    minDurationMs: 3500,
    videoNoLoop: true,
    noLoopNames: ['analyse-yi-jing1.mp4', 'analyse-yi-jing2.mp4'],
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
  // ── Runes scandinaves ─────────────────────────────────────────────────────
  // Base commune à TOUS les tirages runes ; les messages spécifiques (Nornes,
  // Yggdrasil) sont insérés par GET() selon le type demandé (runes-nornes,
  // runes-nornes2, runes-mjolnir, runes-yggdrasil…).
  'runes': {
    messages: {
      fr: [
        'Les runes s’éveillent, la vérité va éclater …',
        'Odin incline son regard sur votre tirage, patience …',
        'Les pierres runiques murmurent leurs secrets. La révélation est proche …',
        'Huginn et Muninn rapportent la sagesse des runes …',
        'L’ancien Futhark dévoile ses glyphes. Patientez !',
        'Urd puise à la source du destin, sa gourde est bientôt pleine de la réponse à votre question …',
        'Les runes gravées s’illuminent une à une. Leur sagesse va apparaître …',
        'Le givre et le feu scellent déjà la réponse à votre question.',
        'Heimdall veille sur les runes. Elles parlent de vous …',
        'Les runes tracent leur chemin vers la lumière. Patience …',
      ],
      en: [
        'The runes awaken — the truth is about to burst forth…',
        'Odin turns his gaze upon your draw — patience…',
        'The rune stones whisper their secrets. The revelation is near…',
        'Huginn and Muninn bring back the wisdom of the runes…',
        'The Elder Futhark unveils its glyphs. Be patient!',
        'Urd draws from the well of fate — her gourd is nearly full of the answer to your question…',
        'The carved runes light up one by one. Their wisdom is about to appear…',
        'Frost and fire are already sealing the answer to your question.',
        'Heimdall watches over the runes. They speak of you…',
        'The runes carve their path toward the light. Patience…',
      ],
    },
    backgroundType: 'video',
    backgroundUrls: [],
    animation: 'fade',
    minDurationMs: 3500,
    videoNoLoop: true,
  },
};

// Messages d'attente spécifiques à certains tirages runes (ajoutés à la base).
const RUNE_EXTRA_MSGS: Record<string, { fr: string; en: string }> = {
  nornes: {
    fr: 'Les Nornes tissent le fil de votre destin …',
    en: 'The Norns weave the thread of your destiny…',
  },
  yggdrasil: {
    fr: 'Yggdrasil, le frêne du monde, frémit …',
    en: 'Yggdrasil, the world ash, trembles…',
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || '';
  const lang = searchParams.get('lang') === 'en' ? 'en' : 'fr';
  let cfg = CONFIG[type];

  // Les types de tirages runes (runes-nornes, runes-nornes2, runes-mjolnir,
  // runes-yggdrasil…) partagent la config commune 'runes'.
  if (!cfg && type.startsWith('runes')) cfg = CONFIG['runes'];

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

  // Pool de messages d'attente : base commune à tous les tirages runes, plus
  // le message spécifique du tirage (Nornes / Yggdrasil) quand il y correspond.
  let messages = cfg.messages[lang];
  if (type.startsWith('runes')) {
    const isEn = lang === 'en';
    messages = [...cfg.messages[lang]];
    if (type.includes('nornes')) {
      const ex = RUNE_EXTRA_MSGS.nornes;
      messages.splice(2, 0, isEn ? ex.en : ex.fr);
    } else if (type.includes('yggdrasil')) {
      const ex = RUNE_EXTRA_MSGS.yggdrasil;
      messages.splice(2, 0, isEn ? ex.en : ex.fr);
    }
  }

  // Vidéos d'attente : mélange aléatoire à CHAQUE requête (ordre différent à
  // chaque visite). Tarot = analyse-tarotX.mp4, runes = analyse-runesX.mp4,
  // yi-jing = analyse-yi-jingX.mp4 (y compris yi-qing).
  const backgroundUrls =
    type.startsWith('tarot') ? listTarotVideos()
    : type.startsWith('runes') ? listRuneVideos()
    : (type.startsWith('yi-jing') || type === 'yi-qing') ? listYiJingVideos()
    : cfg.backgroundUrls;

  // Vidéos à jouer UNE seule fois (pas de boucle) : celles dont le nom de
  // fichier est dans cfg.noLoopNames (ex. analyse-yi-jing1/2.mp4). Les autres
  // bouclent normalement (rotation 2-4 relectures).
  const noLoopUrls = (cfg.noLoopNames ?? [])
    .filter((n) => backgroundUrls.some((u) => u.endsWith(`/${n}`) || u.endsWith(n)))
    .map((n) => backgroundUrls.find((u) => u.endsWith(`/${n}`) || u.endsWith(n))!)
    .filter((u, i, self) => self.indexOf(u) === i);

  return NextResponse.json({
    messages,
    backgroundType: cfg.backgroundType,
    backgroundUrls,
    noLoopUrls,
    animation: cfg.animation,
    minDurationMs: cfg.minDurationMs,
    videoNoLoop: cfg.videoNoLoop ?? false,
  });
}
