import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Fallback local si la DB est indisponible (typage homogène avec la DB)
const FALLBACK_FR: Record<string, {
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
const FALLBACK_EN: Record<string, { messages: string[] }> = {
  'tarot-3-cartes': { messages: ['The oracle studies your draw with care...', 'The arcana slowly reveal themselves...', 'Loading interpretation...'] },
  'tarot-5-cartes': { messages: ['The five paths contemplate each other...', 'The oracle reads the weave of fate...', 'Preparing your reading...'] },
  'tarot-7-cartes': { messages: ['The seven mirrors align...', 'The oracle probes the depths...', 'Loading interpretation...'] },
  'tarot-10-cartes': { messages: ['The ten archetypes converge...', 'The oracle weaves your story...', 'Preparing your reading...'] },
  'yi-qing': { messages: ['The yarrow stalk still resonates...', 'The oracle consults the I Ching...', 'The hexagrams take shape...'] },
  'yi-jing-du-jour': { messages: ['Today\'s hexagram reveals itself...', 'Time suspends its flight...', 'The oracle meditates on your day...'] },
  'quick-divination': { messages: ['Quick divination in progress...', 'The oracle catches your intent...', 'A glimmer sharpens...'] },
  'serene-divination': { messages: ['Studying the draw...', 'The oracle calms with you...', 'The answer ripens in silence...'] },
  'crystal-ball-divination': { messages: ['The crystal ball fogs up...', 'Shapes swirl in the glass...', 'The oracle peers through the mists...'] },
  'magical-divination': { messages: ['The stars align...', 'The oracle invokes your spell...', 'Magic is at work...'] },
  'default': { messages: ['Loading interpretation...', 'The oracle studies your draw...'] },
};

function resolve(type: string, lang: string) {
  const base = FALLBACK_FR[type] || FALLBACK_FR['default'];
  const en = (lang === 'en' ? (FALLBACK_EN[type] || FALLBACK_EN['default']) : null);
  return { ...base, messages: en ? en.messages : base.messages };
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') || '';
  const lang = req.nextUrl.searchParams.get('lang') || 'fr';
  try {
    const row = await prisma.messagesAttente.findUnique({ where: { type } });
    if (!row) {
      return NextResponse.json(resolve(type, lang));
    }
    let messages: string[] = [];
    try { messages = JSON.parse(row.messages); } catch { messages = [row.messages]; }
    // NB: la DB ne possède pas de champ messagesEn — en mode EN on utilise le fallback EN statique (miroir).
    const resolved = resolve(type, lang);
    return NextResponse.json({
      messages: lang === 'en' ? resolved.messages : messages,
      backgroundType: row.backgroundType as 'image' | 'video' | 'none',
      backgroundUrl: row.backgroundUrl,
      animation: row.animation,
      minDurationMs: row.minDurationMs,
    });
  } catch {
    // DB indisponible -> fallback local
    return NextResponse.json(resolve(type, lang));
  }
}
