import { NextRequest, NextResponse } from 'next/server';

const nomsHexagrammes = [
  "Le Créatif (乾 Qián)", "Le Réceptif (坤 Kūn)", "La difficulté initiale (屯 Zhūn)",
  "L'enfants jeunes (蒙 Méng)", "Le besoin attendu (需 Xū)", "L'union douce (訟 Sòng)",
  "Le Ciel du poids (尋 Yín)", "L'union juste (眾 Lún)", "L'accroissement du donné (終 Cóng)",
  "Le pouvoir du grand (損 Suǒ)", "L'avancement modéré (臨 Lín)", "La grande réception (泰 Tài)",
  "Le regard sur la révérence (袋 Guàn)", "La possession en douceur (遁 Dùn)", "L'homme qui marche (師 Shī)",
  "L'existence divine (諸 Cí)", "L'harmonie populaire (泊 Hán)", "L'armée qui se tait (萃 Cù)",
  "Le pouvoir du doux (升 Shēng)", "Le grand bon repos (井 Jǐng)", "Le mouvement soutenu (巽 Xùn)",
  "La prospérité modérée (豐 Fēng)", "Le travail accompli (觀 Guān)", "Le poids du don (渙 Huǒ)",
  "Le retour du éclat (復 Fù)", "Le ciel qui marche (頢 Suān)", "Le chemin du sacré (咸 Xián)",
  "Le grand belle éclosion (沖 Cōng)", "Le petit belle éclosion (熏 Xùn)", "Le grand vérité (節 Jié)",
  "Le petit vérité (中心 Zhōng)", "L'élévation (升 Shēng)", "Le repos du ciel (謙 Qiān)",
  "Le repos de la terre (卑 Bēi)", "Le mouvement du ciel (廣 Kuì)", "L'union du sol (渙 Huǒ)",
  "Le don du grand (禽 Qín)", "Le don du petit (豐 Fēng)", "Le ciel qui entre (復 Fù)",
  "Le repos du mouvement (升 Shēng)", "L'union du repos (節 Jié)", "Le mouvement de la paix (順 Shùn)",
  "Le repos de la paix (南 Nán)", "Le grand éclat (旅 Lǚ)", "Le petit éclat (巫 Wū)",
  "Le repos du danger (帶 Dài)", "Le mouvement du danger (婁 Liú)", "Le grand repos (甠 Qīng)",
  "Le petit repos (益 Yì)", "Le repos qui monte (夬 Guài)", "La montée du repos (夢 Mèng)",
  "Le repos qui descend (震 Zhèn)", "La descente du repos (益 Yì)", "Le grand qui donne (畜 Chù)",
  "Le petit qui donne (亢 Kàng)", "Le don du repos (肒 Huǎng)", "Le repos du don (姦 Jiān)",
  "Le mouvement qui donne (彖 Túàn)", "Le don du mouvement (蓄 Xù)", "Le repos qui donne (益 Yì)",
  "Le don du repos (亢 Kàng)", "Le grand mouvement repos (旗 Qí)", "Le petit mouvement repos (復 Fù)"
];

export async function POST(request: NextRequest) {
  try {
    const { baguette } = await request.json();
    
    if (!baguette || baguette < 1 || baguette > 64) {
      return NextResponse.json({ error: 'Numéro de baguette invalide (1-64)' });
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({
        numero: baguette,
        nom: "Hexagramme " + baguette,
        meditation: "Contemplez ce qui se présente.",
        conseil: "Suivez le fil de votre intuition.",
        attitude: "Restez présent et attentif."
      });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://tarot-app.vercel.app',
        'X-Title': 'Yi Jing Tarot App'
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-lite',
        messages: [
          {
            role: 'system',
            content: 'Tu es un maître du Yi Jing. Réponds uniquement en JSON avec meditation, conseil, et attitude pour une lecture claire.'
          },
          {
            role: 'user',
            content: `Donne une interprétation Yi Jing pour la baguette n°${baguette}. Fournis: meditation (texte introspectif), conseil (guidance pratique), attitude (comportement recommandé). Format JSON uniquement.`
          }
        ]
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\{[\s\S]*"attitude"[^}]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json({
        numero: baguette,
        nom: nomsHexagrammes[baguette-1] || "Hexagramme " + baguette,
        meditation: parsed.meditation,
        conseil: parsed.conseil,
        attitude: parsed.attitude
      });
    }

    return NextResponse.json({
      numero: baguette,
      nom: nomsHexagrammes[baguette-1] || "Hexagramme " + baguette,
      meditation: content,
      conseil: "Guidance en cours...",
      attitude: "Restez ouvert."
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Erreur interprétation',
      numero: 1,
      nom: "Le Créatif",
      meditation: "Le Ciel est en mouvement.",
      conseil: "Agis avec force.",
      attitude: "Sois déterminé."
    });
  }
}