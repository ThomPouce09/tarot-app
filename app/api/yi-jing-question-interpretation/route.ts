import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { callOracle, extractJsonObject } from '@/lib/llm';

const nomsHexagrammes = [
  "Le Créatif (乾 Qián)", "Le Réceptif (坤 Kūn)", "La difficulté initiale (屯 Zhūn)",
  "L'enfants jeunes (蒙 Méng)", "Le besoin attendu (需 Xū)", "L'union douce (訟 Sòng)",
  "Le Ciel du poids (尋 Yín)", "L'union juste (眾 Lún)", "L'accroissement du donné (終 Cóng)",
  "Le pouvoir du grand (損 Suǒ)", "L'avancement modéré (臨 Lín)", "La grande réception (泰 Tài)",
  "Le regard sur la révérence (袋 Guàn)", "La possession en douceur (遁 Dùn)", "L'homme qui marche (師 Shī)",
  "L'existence divine (諸 Cí)", "L'harmonie populaire (泊 Hán)", "L'armée qui se tait (萃 Cù)",
  "Le pouvoir du doux (升 Shēng)", "Le grand bon repos (井 Jǐng)", "Le mouvement soutenu (巽 Xùn)",
  "La prospérité modérée (豐 Fēng)", "Le travail accompli (觀 Guān)", "Le poids du don (渙 Huǒ)",
  "Le retour du éclat (復 Fù)", "Le ciel qui marche (頢 Suān)", "Le chemin du sacré (咸 Xián)",
  "Le grand belle éclosion (沖 Cōng)", "Le petit belle éclosion (熏 Xùn)", "Le grand vérité (節 Jié)",
  "Le petit vérité (中心 Zhōng)", "L'élévation (升 Shēng)", "Le repos du ciel (謙 Qiān)",
  "Le repos de la terre (卑 Bēi)", "Le mouvement du ciel (廣 Kuì)", "L'union du sol (渙 Huǒ)",
  "Le don du grand (禽 Qín)", "Le don du petit (豐 Fēng)", "Le ciel qui entre (復 Fù)",
  "Le repos du mouvement (升 Shēng)", "L'union du repos (節 Jié)", "Le mouvement de la paix (順 Shùn)",
  "Le repos de la paix (南 Nán)", "Le grand éclat (旅 Lǚ)", "Le petit éclat (巫 Wū)",
  "Le repos du danger (帶 Dài)", "Le mouvement du danger (婁 Liú)", "Le grand repos (甠 Qīng)",
  "Le petit repos (益 Yì)", "Le repos qui monte (夬 Guài)", "La montée du repos (夢 Mèng)",
  "Le repos qui descend (震 Zhèn)", "La descente du repos (益 Yì)", "Le grand qui donne (畜 Chù)",
  "Le petit qui donne (亢 Kàng)", "Le don du repos (肒 Huǎng)", "Le repos du don (姦 Jiān)",
  "Le mouvement qui donne (彖 Túàn)", "Le don du mouvement (蓄 Xù)", "Le repos qui donne (益 Yì)",
  "Le don du repos (亢 Kàng)"
];

export async function POST(request: NextRequest) {
  try {
    const { baguette, userId, question } = await request.json();
    const numeroBaguette = parseInt(baguette) || 1;
    const nomHexagramme = nomsHexagrammes[numeroBaguette-1] || "Hexagramme " + numeroBaguette;

    // Prompt enrichi avec la question de l'utilisateur
    const prompt = `Tu es un oracle Yi Jing (I Ching). L'utilisateur a posé cette question:
"${question}"

Le tirage d'achillée a donné l'hexagramme ${numeroBaguette} ("${nomHexagramme}").

Réponds directement à la question de l'utilisateur en t'appuyant sur la sagesse de cet hexagramme. Sois profond, poétique et personnel. Réponds en JSON: {"meditation":"...","conseil":"...","attitude":"..."}

- meditation: une réflexion profonde qui éclaire la question posée à travers le prisme de l'hexagramme
- conseil: un conseil pratique et direct lié à la question
- attitude: l'attitude intérieure à adopter face à cette situation`;

    const content = (await callOracle(prompt)) || '';
    console.log('[YI-JING-QUESTION] Réponse IA brute:', content.substring(0, 300));

    let parsed: { meditation?: string; conseil?: string; attitude?: string } = {};
    parsed = extractJsonObject(content);
    // Enregistrer le tirage Yi Jing avec question si userId fourni
    if (userId) {
      try {
        const user = await prisma.user.findUnique({ where: { email: userId } });
        if (user) {
          await prisma.reading.create({
            data: {
              userId: user.id,
              type: 'yi-qing',
              question: question || null,
              cards: JSON.stringify([{
                id: numeroBaguette,
                name: nomHexagramme
              }]),
              interpretation: JSON.stringify({
                meditation: parsed.meditation || "L'hexagramme vous invite à méditer sur cette situation.",
                conseil: parsed.conseil || "Laissez les signes vous guider.",
                attitude: parsed.attitude || "Restez ouvert et réceptif."
              })
            }
          });
        }
      } catch (e) {
        console.error('Error saving Yi Jing question reading:', e);
      }
    }

    return NextResponse.json({
      numero: numeroBaguette,
      nom: nomHexagramme,
      question: question || null,
      meditation: parsed.meditation || "L'hexagramme vous invite à méditer sur cette situation.",
      conseil: parsed.conseil || "Laissez les signes vous guider.",
      attitude: parsed.attitude || "Restez ouvert et réceptif."
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
