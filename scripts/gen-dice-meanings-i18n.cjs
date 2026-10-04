// Traduit les 36 significations des dés du zodiaque (12 planètes, 12 signes,
// 12 maisons) en en/es/hi via b.ai (qwen, enable_thinking:false) et écrit
// components/astro-dice/meanings-i18n.ts (généré, comme tarot-data-i18n).
// Exécution : node scripts/gen-dice-meanings-i18n.cjs
const fs = require('fs');
const path = require('path');

// --- env ---
const env = {};
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)) {
  const i = line.indexOf('=');
  if (i > 0 && !line.trim().startsWith('#')) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const KEY = env.B_AI_API_KEY;
if (!KEY) { console.error('B_AI_API_KEY missing'); process.exit(1); }

const PLANET = ['☉','☽','☿','♀','♂','♃','♄','♅','♆','♇','☊','☋'];
const SIGN = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const HOUSE = ['1','2','3','4','5','6','7','8','9','10','11','12'];

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
          { role: 'system', content: 'Tu es traducteur éditorial ésotérique. Tu réponds UNIQUEMENT avec un JSON valide, sans commentaire, sans bloc de code.' },
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

function buildPrompt(kindLabel, frs) {
  return `Traduis ces ${frs.length} courtes significations d'oracle (ton bienveillant, tutoiement, façon fortune-cookie) du français vers l'anglais (en), l'espagnol (es, castillan vouvoiement « usted ») et l'hindi (hi, devanagari, tournures naturelles indiennes). Chaque texte fait 180-320 caractères dans la langue cible, une seule phrase fluide ou deux courtes, PAS de guillemets doubles dans les valeurs.

Réponds avec EXACTEMENT ce JSON : {"1":{"en":"…","es":"…","hi":"…"},"2":{…},…} où la clé est le numéro ci-dessous (${kindLabel}).

${frs.map((t, i) => `${i + 1}: ${t}`).join('\n')}`;
}

// parse la table FR depuis meanings.ts
const src = fs.readFileSync(path.join(__dirname, '..', 'components/astro-dice/meanings.ts'), 'utf8');
function parseTable(name) {
  const m = src.match(new RegExp('export const ' + name + ': Record<string, string> = \\{([\\s\\S]*?)\\n\\};'));
  if (!m) throw new Error(name + ' not found');
  const out = {};
  const re = /'([^']+)':\s*\n?\s*"((?:[^"\\]|\\.)*)"/g;
  let r;
  while ((r = re.exec(m[1]))) out[r[1]] = JSON.parse('"' + r[2] + '"');
  return out;
}

async function main() {
  const tables = { planet: parseTable('PLANET_MEANINGS'), sign: parseTable('SIGN_MEANINGS'), house: parseTable('HOUSE_MEANINGS') };
  const result = {};
  for (const kind of ['planet', 'sign', 'house']) {
    const keys = kind === 'planet' ? PLANET : kind === 'sign' ? SIGN : HOUSE;
    const frs = keys.map((k) => tables[kind][k]);
    if (frs.some((f) => !f)) throw new Error(kind + ' missing FR for ' + keys.join(','));
    let json = null;
    for (let attempt = 1; attempt <= 3 && !json; attempt++) {
      try { json = await callOracle(buildPrompt(kind, frs)); } catch (e) { console.warn(kind, 'attempt', attempt, 'failed:', String(e).slice(0, 160)); await new Promise((r) => setTimeout(r, 3000 * attempt)); }
    }
    if (!json) throw new Error('no translation for ' + kind);
    const missing = keys.filter((_, i) => !json[i + 1] || !json[i + 1].en || !json[i + 1].es || !json[i + 1].hi);
    if (missing.length) throw new Error(kind + ': missing entries for ' + missing.join(','));
    result[kind] = keys.map((k, i) => ({ key: k, en: json[i + 1].en.trim(), es: json[i + 1].es.trim(), hi: json[i + 1].hi.trim() }));
  }
  fs.writeFileSync(path.join(__dirname, 'dice-meanings-translated.json'), JSON.stringify(result, null, 2), 'utf8');
  console.log('OK wrote scripts/dice-meanings-translated.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
