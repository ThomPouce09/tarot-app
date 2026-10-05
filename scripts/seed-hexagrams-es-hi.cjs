// Remplit hexagrams_es / hexagrams_hi : noms + synthèses des 64 hexagrammes.
//   - noms ES  : canoniques (traduction Wilhelm, figés ici) ;
//   - synthèses ES + noms/synthèses HI : traduits depuis les synthèses FR lues en base.
// Garde-fous par entrée (le LLM recopie parfois le FR) + une relance ciblée.
// La table `hexagrams` n'est JAMAIS modifiée.
// Exécution : node scripts/seed-hexagrams-es-hi.cjs
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- env (.env.local) ---
const env = {};
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)) {
  const i = line.indexOf('=');
  if (i > 0 && !line.trim().startsWith('#')) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const KEY = env.B_AI_API_KEY;
if (!KEY) { console.error('B_AI_API_KEY manquante'); process.exit(1); }

// Noms espagnols canoniques (traduction Wilhelm, usage courant en castillan).
const ES_NAMES = {
  1: 'Lo Creativo', 2: 'Lo Receptivo', 3: 'La Dificultad Inicial', 4: 'La Necedad Juvenil',
  5: 'La Espera', 6: 'El Conflicto', 7: 'El Ejército', 8: 'La Solidaridad',
  9: 'La Fuerza Domesticadora de lo Pequeño', 10: 'El Porte (La Conducta)', 11: 'La Paz',
  12: 'El Estancamiento', 13: 'La Comunidad con los Hombres', 14: 'La Posesión de lo Grande',
  15: 'La Modestia', 16: 'El Entusiasmo', 17: 'El Seguimiento', 18: 'El Trabajo en lo Corrompido',
  19: 'El Acercamiento', 20: 'La Contemplación', 21: 'La Mordedura Tajante', 22: 'La Gracia',
  23: 'La Desintegración', 24: 'El Retorno', 25: 'La Inocencia', 26: 'La Fuerza Domesticadora de lo Grande',
  27: 'La Nutrición', 28: 'La Preponderancia de lo Grande', 29: 'Lo Abismal (El Agua)',
  30: 'Lo Adherente (El Fuego)', 31: 'El Influjo', 32: 'La Duración', 33: 'La Retirada',
  34: 'El Poder de lo Grande', 35: 'El Progreso', 36: 'El Oscurecimiento de la Luz', 37: 'La Familia',
  38: 'La Oposición', 39: 'El Impedimento', 40: 'La Liberación', 41: 'La Disminución',
  42: 'El Aumento', 43: 'El Desbordamiento', 44: 'El Acercamiento a la Doncella', 45: 'La Reunión',
  46: 'La Subida', 47: 'La Desolación', 48: 'El Pozo', 49: 'La Revolución', 50: 'El Caldero',
  51: 'La Conmoción', 52: 'La Quietud', 53: 'El Desarrollo', 54: 'La Muchacha que se Casa',
  55: 'La Abundancia', 56: 'El Andariego', 57: 'Lo Suave', 58: 'Lo Sereno', 59: 'La Disolución',
  60: 'La Limitación', 61: 'La Verdad Interior', 62: 'La Preponderancia de lo Pequeño',
  63: 'Después de la Completación', 64: 'Antes de la Completación',
};

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

const DEVA = /[\u0900-\u097F]/;
const FR_ONLY = /[çœàèùêîôûë]/i;
// Marqueurs turcs de tournure française restée non traduite (le LLM recopie parfois).
const FR_WORDS = /(^|[^A-Za-zÀ-ÿ])(votre|vos|avec|dans|pour|plus|sont|être|tout|toute|aucun|aucune|rien|vers|chez|sans|sous|du|une|les|est|le|la|des)([^A-Za-zÀ-ÿ]|$)/i;

function badEs(syn, frSyn) {
  if (!syn || syn.length < 60 || syn.length > 1400) return 'longueur';
  if (FR_ONLY.test(syn)) return 'caracteres francais';
  if (syn.trim() === frSyn.trim()) return 'copie du FR';
  if (FR_WORDS.test(syn)) return 'mots-outils francais';
  return null;
}
function badHi(s, min) {
  if (!s || s.length < min) return 'trop court';
  if (!DEVA.test(s)) return 'pas de devanagari';
  return null;
}

function promptFor(batch) {
  const rows = batch
    .map((h) => `${h.numero} | FR: "${h.element}" | EN: "${h.nameEn || ''}" | SYNTHESE FR: ${h.synthese}`)
    .join('\n');
  return `Pour chaque hexagramme du Yi Jing ci-dessous, produis :
- "synEs" : la synthèse FR traduite en espagnol castillan naturel (vouvoiement « usted », 180-320 caractères, ton oraculaire sobre, PAS de guillemets doubles dans la valeur) ;
- "nameHi" : le nom de l'hexagramme en hindi (2 à 5 mots, devanagari, traduction du sens — pas de translittération du pinyin) ;
- "synHi" : la synthèse FR traduite en hindi (devanagari, 150-320 caractères, tournures naturelles indiennes, ton oraculaire).

Réponds EXACTEMENT avec ce JSON, une clé par numéro :
{"<numero>":{"synEs":"…","nameHi":"…","synHi":"…"}, …}

${rows}`;
}

(async () => {
  const fr = await prisma.$queryRawUnsafe('SELECT numero, element, synthese FROM "hexagrams" ORDER BY numero');
  let en = [];
  try { en = await prisma.$queryRawUnsafe('SELECT numero, name_en FROM "hexagrams_en" ORDER BY numero'); } catch {}
  const nameEn = new Map(en.map((r) => [r.numero, r.name_en]));
  const rows = fr.map((h) => ({ ...h, nameEn: nameEn.get(h.numero) || '' }));
  console.log('hexagrammes FR lus : ' + rows.length);

  const out = {};
  const BATCH = 6;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    let got = null;
    for (let attempt = 1; attempt <= 2 && !got; attempt++) {
      try { got = await callLLM(promptFor(batch)); }
      catch (e) { console.log(`  lot ${i / BATCH + 1} tentative ${attempt} : ${e.message}`); }
    }
    if (!got) { console.log('  lot ' + (i / BATCH + 1) + ' ECHEC'); continue; }
    for (const h of batch) {
      const v = got[String(h.numero)] || got[h.numero];
      if (v) out[h.numero] = v;
    }
    console.log(`  lot ${i / BATCH + 1}/${Math.ceil(rows.length / BATCH)} ok (${Object.keys(out).length} cumulés)`);
  }

  // Contrôles + relance ciblée des entrées fautives.
  const offenders = [];
  for (const h of rows) {
    const v = out[h.numero];
    const why = !v ? 'absent'
      : badEs(v.synEs, h.synthese) || badHi(v.nameHi, 2) || badHi(v.synHi, 40);
    if (why) offenders.push({ h, why, v });
  }
  console.log('entrées fautives : ' + offenders.length);
  if (offenders.length) {
    for (const o of offenders) {
      try {
        const retry = await callLLM(promptFor([o.h]));
        const v = retry[String(o.h.numero)] || retry[o.h.numero];
        if (v) out[o.h.numero] = v;
      } catch (e) { console.log('  relance ' + o.h.numero + ' échec : ' + e.message); }
    }
  }

  // Écriture.
  let okEs = 0, okHi = 0, ko = [];
  for (const h of rows) {
    const v = out[h.numero] || {};
    const esName = ES_NAMES[h.numero] || null;
    const esSyn = v.synEs && !badEs(v.synEs, h.synthese) ? String(v.synEs).trim() : null;
    const hiName = v.nameHi && !badHi(v.nameHi, 2) ? String(v.nameHi).trim() : null;
    const hiSyn = v.synHi && !badHi(v.synHi, 40) ? String(v.synHi).trim() : null;
    await prisma.$executeRawUnsafe(
      `INSERT INTO hexagrams_es (numero, name_es, synthese_es) VALUES ($1,$2,$3)
       ON CONFLICT (numero) DO UPDATE SET name_es = EXCLUDED.name_es, synthese_es = EXCLUDED.synthese_es`,
      h.numero, esName, esSyn
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO hexagrams_hi (numero, name_hi, synthese_hi) VALUES ($1,$2,$3)
       ON CONFLICT (numero) DO UPDATE SET name_hi = EXCLUDED.name_hi, synthese_hi = EXCLUDED.synthese_hi`,
      h.numero, hiName, hiSyn
    );
    if (esSyn) okEs++;
    if (hiSyn) okHi++;
    if (!esSyn || !hiSyn) ko.push(`${h.numero}(es:${esSyn ? 'ok' : 'NON'} hi:${hiSyn ? 'ok' : 'NON'})`);
  }

  const [{ es, hi }] = await prisma.$queryRawUnsafe(
    `SELECT (SELECT count(*)::int FROM hexagrams_es WHERE synthese_es IS NOT NULL) AS es,
            (SELECT count(*)::int FROM hexagrams_hi WHERE synthese_hi IS NOT NULL) AS hi`
  );
  console.log(`EN BASE : synthèses ES=${es}/64, HI=${hi}/64`);
  if (ko.length) console.log('manquants : ' + ko.join(' '));
  await prisma.$disconnect();
})().catch(async (e) => { console.error('ERREUR :', e.message); await prisma.$disconnect(); process.exit(1); });
