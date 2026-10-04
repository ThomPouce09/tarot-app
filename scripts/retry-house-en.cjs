// Retry ciblé : traduire les 12 significations des MAISONS en anglais (le lot
// précédent a recopié le français). Lit scripts/dice-meanings-translated.json,
// remplace house.en, réécrit.
const fs = require('fs');
const path = require('path');

const env = {};
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)) {
  const i = line.indexOf('=');
  if (i > 0 && !line.trim().startsWith('#')) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const KEY = env.B_AI_API_KEY;

const HOUSE_FR = [
  "Maison I — Toi.", "Maison II — Tes ressources.", "Maison III — Ton environnement proche.",
  "Maison IV — Tes racines.", "Maison V — Ta joie de vivre.", "Maison VI — Ton quotidien.",
  "Maison VII — L'autre.", "Maison VIII — Les profondeurs.", "Maison IX — L'horizon.",
  "Maison X — Ta place dans le monde.", "Maison XI — Tes alliances.", "Maison XII — L'invisible.",
];

function extractJson(text) {
  const i = text.indexOf('{'), j = text.lastIndexOf('}');
  if (i === -1 || j === -1) throw new Error('no JSON: ' + text.slice(0, 200));
  return JSON.parse(text.slice(i, j + 1));
}

async function callOracle(prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const res = await fetch('https://api.b.ai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3.8-flash',
        messages: [
          { role: 'system', content: 'You are an editorial esoteric translator. You answer ONLY with valid JSON, no comments, no code fences.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 4000,
        enable_thinking: false,
      }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
    const data = await res.json();
    const content = (data.choices?.[0]?.message?.content || '').trim();
    if (!content) throw new Error('empty content');
    return extractJson(content);
  } finally { clearTimeout(timer); }
}

async function main() {
  const file = path.join(__dirname, 'dice-meanings-translated.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const src = fs.readFileSync(path.join(__dirname, '..', 'components/astro-dice/meanings.ts'), 'utf8');
  const m = src.match(/export const HOUSE_MEANINGS: Record<string, string> = \{([\s\S]*?)\n\};/);
  const re = /'([^']+)':\s*\n?\s*"((?:[^"\\]|\\.)*)"/g;
  const frs = [];
  let r;
  while ((r = re.exec(m[1]))) frs.push(JSON.parse('"' + r[2] + '"'));

  const prompt = `Translate these 12 French oracle meanings (astrology houses, gentle tone, addressing the reader as "you") INTO ENGLISH ONLY. Output JSON exactly: {"1":{"en":"..."},"2":{"en":"..."},...,"12":{"en":"..."}}. Keys are the numbers below. Each English text: one or two flowing sentences, 120-220 characters, natural English, fortune-cookie tone. DO NOT keep any French words: "Maison" must become "House", "Toi" → "You", etc.

${frs.map((t, i) => `${i + 1}: ${t}`).join('\n')}`;

  let json = null;
  for (let attempt = 1; attempt <= 3 && !json; attempt++) {
    try { json = await callOracle(prompt); } catch (e) { console.warn('attempt', attempt, 'failed:', String(e).slice(0, 160)); await new Promise((res) => setTimeout(res, 3000 * attempt)); }
  }
  if (!json) throw new Error('no translation');
  data.house.forEach((row, i) => {
    const en = json[i + 1] && json[i + 1].en;
    const FR_WORDS = /\b(maison|toit?|tes|ton|ta|les|des|l|au|aux|avec|dans|pour|qui|est|sont|votre|vos|notre|ce|cette|mon|mes|son|ses)\b/i;
    if (!en || FR_WORDS.test(en)) throw new Error('house ' + (i + 1) + ' EN still French: ' + (en || '').slice(0, 60));
    row.en = en.trim();
  });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  console.log('OK house.en refreshed');
}

main().catch((e) => { console.error(e); process.exit(1); });
