import { NextRequest, NextResponse } from 'next/server';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { pick4 } from '@/lib/i18n';
import { resolveLang } from '@/lib/lang';
import { waitMessages, universeForType } from '@/lib/wait-messages';

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
function listYiJingHVideos(): string[] { return listVideos('analyse-yi-jing-h'); }

// Config technique d'attente par type de tirage (vidéos, animation, durée).
// Les MESSAGES ne sont plus ici : ils viennent du corpus officiel
// lib/wait-messages.ts (pool mélangé par univers, à chaque requête).
const CONFIG: Record<string, {
  backgroundType: 'image' | 'video' | 'none';
  noLoopNames?: string[];
  animation: string;
  minDurationMs: number;
  videoNoLoop?: boolean;
}> = {
  'yi-jing-double': { backgroundType: 'video', animation: 'fade', minDurationMs: 3500 },
  'yi-jing-simple': { backgroundType: 'video', animation: 'fade', minDurationMs: 3500, videoNoLoop: true, noLoopNames: ['analyse-yi-jing1.mp4', 'analyse-yi-jing2.mp4'] },
  'yi-jing-simplifie': { backgroundType: 'video', animation: 'fade', minDurationMs: 3500, videoNoLoop: true, noLoopNames: ['analyse-yi-jing1.mp4', 'analyse-yi-jing2.mp4'] },
  'yi-jing-question': { backgroundType: 'video', animation: 'fade', minDurationMs: 3500, videoNoLoop: true, noLoopNames: ['analyse-yi-jing1.mp4', 'analyse-yi-jing2.mp4'] },
  'yi-qing': { backgroundType: 'video', animation: 'fade', minDurationMs: 3500, videoNoLoop: true, noLoopNames: ['analyse-yi-jing1.mp4', 'analyse-yi-jing2.mp4'] },
  'tarot-3-cartes': { backgroundType: 'video', animation: 'fade', minDurationMs: 3500, videoNoLoop: true },
  'tarot-3-cartes-simplifie': { backgroundType: 'video', animation: 'fade', minDurationMs: 3500, videoNoLoop: true },
  'tarot-5-cartes': { backgroundType: 'video', animation: 'fade', minDurationMs: 3500, videoNoLoop: true },
  'tarot-5-c-manuelle': { backgroundType: 'video', animation: 'fade', minDurationMs: 3500, videoNoLoop: true },
  'runes': { backgroundType: 'video', animation: 'fade', minDurationMs: 3500, videoNoLoop: true },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || '';
  const lang = resolveLang(searchParams.get('lang'));
  let cfg = CONFIG[type];

  // Les types de tirages runes (runes-nornes, runes-nornes2, runes-mjolnir,
  // runes-yggdrasil…) partagent la config commune 'runes'.
  if (!cfg && type.startsWith('runes')) cfg = CONFIG['runes'];
  // Idem pour les variantes yi-jing / tarot non listées explicitement.
  if (!cfg && (type.startsWith('yi-jing') || type === 'yi-qing')) cfg = CONFIG['yi-jing-simple'];
  if (!cfg && type.startsWith('tarot')) cfg = CONFIG['tarot-3-cartes'];

  // Pool de messages : corpus officiel, ORDRE MÉLANGÉ à chaque appel (comme
  // les vidéos) — la phrase d'accroche change à chaque attente, puis rotation
  // 5 s dans l'ordre mélangé côté client.
  const universe = universeForType(type);
  const messages = universe ? waitMessages(universe, lang) : [];

  if (!cfg) {
    // Fallback generique
    return NextResponse.json({
      messages: [pick4('Chargement de l’interprétation…', 'Loading the interpretation…', "Cargando la interpretación…", "व्याख्या लोड हो रही है…")(lang)],
      backgroundType: 'none',
      backgroundUrls: [],
      animation: 'fade',
      minDurationMs: 2500,
    });
  }

  // Vidéos d'attente : mélange aléatoire à CHAQUE requête (ordre différent à
  // chaque visite). Tarot = analyse-tarotX.mp4, runes = analyse-runesX.mp4,
  // yi-jing = analyse-yi-jingX.mp4 (y compris yi-qing).
  const backgroundUrls =
    type.startsWith('tarot') ? listTarotVideos()
    : type.startsWith('runes') ? listRuneVideos()
    : type === 'yi-jing-double' ? listYiJingHVideos()
    : (type.startsWith('yi-jing') || type === 'yi-qing') ? listYiJingVideos()
    : [];

  // Vidéos à jouer UNE seule fois (pas de boucle) : celles dont le nom de
  // fichier est dans cfg.noLoopNames (ex. analyse-yi-jing1/2.mp4). Les autres
  // bouclent normalement (rotation 2-4 relectures).
  const noLoopUrls = (cfg.noLoopNames ?? [])
    .map((n) => backgroundUrls.find((u) => u.endsWith(`/${n}`) || u.endsWith(n)))
    .filter((u): u is string => !!u);

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
