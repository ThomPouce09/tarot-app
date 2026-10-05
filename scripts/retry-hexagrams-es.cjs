// Répare les synthèses ES manquantes (garde-fou initial trop strict : il
// rejetait des textes espagnols contenant « la »/« le »/« des »).
// Complète uniquement les lignes où synthese_es est NULL, avec relance ciblée.
// Exécution : node scripts/retry-hexagrams-es.cjs
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const env = {};
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)) {
  const i = line.indexOf('=');
  if (i > 0 && !line.trim().startsWith('#')) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const KEY = env.B_AI_API_KEY;
if (!KEY) { console.error('B_AI_API_KEY manquante'); process.exit(1); }

function extractJson(text) {
  const i = text.indexOf('{'), j = text.lastIndexOf('}');
  if (i === -1 || j === -1) throw new Error('pas de JSON: ' + text.slice(0, 200));
  return JSON.parse(text.slice(i, j + 1));
}

async function callLLM(prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 150000);
  try {
    const res = await fetch('https://api.b.ai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3.8-flash',
        messages: [
          { role: 'system', content: 'Tu es traducteur éditorial ésotérique. Tu réponds UNIQUEMENT avec un JSON valide, sans commentaire, sans bloc de code.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        enable_thinking: false,
      }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
    const data = await res.json();
    const content = (data.choices?.[0]?.message?.content || '').trim();
    if (!content) throw new Error('contenu vide');
    return extractJson(content);
  } finally { clearTimeout(timer); }
}

// Garde-fou ES resserré sur des marqueurs SANS ambiguïté espagnole.
const FR_ONLY = /[çœàèùêîôûë]/i;
const FR_WORDS = /(^|[^A-Za-zÀ-ÿ])(votre|vos|avec|dans|pour|sont|être|tout|toute|aucun|aucune|rien|chez|sans|sous|du|une|les|ainsi|donc|plusieurs)([^A-Za-zÀ-ÿ]|$)/i;
function badEs(syn, frSyn) {
  if (!syn || syn.length < 40 || syn.length > 1400) return 'longueur';
  if (FR_ONLY.test(syn)) return 'caracteres francais';
  if (syn.trim() === frSyn.trim()) return 'copie du FR';
  if (FR_WORDS.test(syn)) return 'mots-outils francais';
  return null;
}

const promptFor = (batch) => `Traduis en espagnol castillan naturel (vouvoiement « usted », ton oraculaire sobre) chacune de ces synthèses d'hexagramme du Yi Jing. 180 à 320 caractères par synthèse, une seule phrase fluide ou deux courtes, PAS de guillemets doubles dans les valeurs.

Réponds EXACTEMENT avec ce JSON, une clé par numéro : {"<numero>":"…", …}

${batch.map((h) => `${h.numero} | ${h.element} : ${h.synthese}`).join('\n')}`;

(async () => {
  const todo = await prisma.$queryRawUnsafe(
    `SELECT h.numero, h.element, h.synthese
     FROM "hexagrams" h
     LEFT JOIN hexagrams_es s ON s.numero = h.numero
     WHERE s.synthese_es IS NULL
     ORDER BY h.numero`
  );
  console.log('synthèses ES à produire : ' + todo.length);
  if (!todo.length) { await prisma.$disconnect(); return; }

  const got = {};
  const BATCH = 8;
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    let res = null;
    for (let a = 1; a <= 3 && !res; a++) {
      try { res = await callLLM(promptFor(batch)); }
      catch (e) { console.log(`  lot ${i / BATCH + 1} essai ${a} : ${e.message}`); }
    }
    if (!res) continue;
    for (const h of batch) {
      const v = res[String(h.numero)] || res[h.numero];
      if (v) got[h.numero] = String(v).trim();
    }
    console.log(`  lot ${i / BATCH + 1}/${Math.ceil(todo.length / BATCH)} ok`);
  }

  let written = 0, rejected = [];
  for (const h of todo) {
    const v = got[h.numero];
    const why = badEs(v, h.synthese);
    if (why) { rejected.push(`${h.numero}(${why})`); continue; }
    await prisma.$executeRawUnsafe(
      `UPDATE hexagrams_es SET synthese_es = $2 WHERE numero = $1`,
      h.numero, v
    );
    written++;
  }
  const [{ n }] = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM hexagrams_es WHERE synthese_es IS NOT NULL`
  );
  console.log(`écrites : ${written} — total ES en base : ${n}/64`);
  if (rejected.length) console.log('rejetées : ' + rejected.join(' '));
  await prisma.$disconnect();
})().catch(async (e) => { console.error('ERREUR :', e.message); await prisma.$disconnect(); process.exit(1); });
