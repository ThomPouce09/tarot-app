import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Fallback local si la DB est indisponible (typage homogène avec la DB)
const FALLBACK: Record<string, {
  messages: string[];
  backgroundType: 'image' | 'video' | 'none';
  backgroundUrl: string | null;
  animation: string;
  minDurationMs: number;
}> = {
  'tarot-3-cartes': { messages: ['L\'oracle étudie avec soin votre tirage...', 'Les arcanes se dévoilent lentement...', 'Chargement de l\'interprétation...'], backgroundType: 'image', backgroundUrl: '/wait/tarot-3-cartes.jpg', animation: 'fade', minDurationMs: 2600 },
  'tarot-5-cartes': { messages: ['Les cinq voies se contemplent...', 'L\'oracle lit les entrelacs du destin...', 'Préparation de votre lecture...'], backgroundType: 'video', backgroundUrl: '/wait/tarot-5-cartes.mp4', animation: 'orbit', minDurationMs: 2600 },
  'tarot-7-cartes': { messages: ['Les sept miroirs s\'alignent...', 'L\'oracle sonde les profondeurs...', 'Chargement de l\'interprétation...'], backgroundType: 'image', backgroundUrl: '/wait/tarot-7-cartes.jpg', animation: 'sparkle', minDurationMs: 2600 },
  'tarot-10-cartes': { messages: ['Les dix archétypes convergent...', 'L\'oracle tisse votre histoire...', 'Préparation de votre lecture...'], backgroundType: 'image', backgroundUrl: '/wait/tarot-10-cartes.jpg', animation: 'orbit', minDurationMs: 2600 },
  'yi-qing': { messages: ['La baguette d\'achillée résonne encore...', 'L\'oracle consulte le Yi Jing...', 'Les hexagrammes prennent forme...'], backgroundType: 'video', backgroundUrl: '/wait/yi-qing.mp4', animation: 'ripples', minDurationMs: 2600 },
  'yi-jing-du-jour': { messages: ['L\'hexagramme du jour se révèle...', 'Le temps suspend son vol...', 'L\'oracle médite sur votre journée...'], backgroundType: 'image', backgroundUrl: '/wait/yi-jing-du-jour.jpg', animation: 'ripples', minDurationMs: 2600 },
  'quick-divination': { messages: ['Divination rapide en cours...', 'L\'oracle capte votre intention...', 'Une lueur se précise...'], backgroundType: 'none', backgroundUrl: null, animation: 'sparkle', minDurationMs: 2000 },
  'serene-divination': { messages: ['Étude du tirage en cours...', 'L\'oracle s\'apaise avec vous...', 'La réponse mûrit en silence...'], backgroundType: 'image', backgroundUrl: '/wait/serene-divination.jpg', animation: 'fade', minDurationMs: 2600 },
  'crystal-ball-divination': { messages: ['La boule de cristal s\'embue...', 'Des formes tournoient dans le verre...', 'L\'oracle scrute les brumes...'], backgroundType: 'video', backgroundUrl: '/wait/crystal-ball-divination.mp4', animation: 'orbit', minDurationMs: 2600 },
  'magical-divination': { messages: ['Les étoiles s\'alignent...', 'L\'oracle invoque votre sort...', 'La magie opère...'], backgroundType: 'image', backgroundUrl: '/wait/magical-divination.jpg', animation: 'sparkle', minDurationMs: 2600 },
  'default': { messages: ['Chargement de l\'interprétation...', 'L\'oracle étudie votre tirage...'], backgroundType: 'none', backgroundUrl: null, animation: 'fade', minDurationMs: 2500 },
};

function resolve(type: string) {
  return FALLBACK[type] || FALLBACK['default'];
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') || '';
  try {
    const row = await prisma.messagesAttente.findUnique({ where: { type } });
    if (!row) {
      return NextResponse.json(resolve(type));
    }
    let messages: string[] = [];
    try { messages = JSON.parse(row.messages); } catch { messages = [row.messages]; }
    return NextResponse.json({
      messages,
      backgroundType: row.backgroundType as 'image' | 'video' | 'none',
      backgroundUrl: row.backgroundUrl,
      animation: row.animation,
      minDurationMs: row.minDurationMs,
    });
  } catch {
    // DB indisponible -> fallback local
    return NextResponse.json(resolve(type));
  }
}
