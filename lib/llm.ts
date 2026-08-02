/**
 * Cascade d'appels IA partagée pour toutes les interprétations (Tarot, Yi Jing).
 *
 * Ordre de fallback :
 *   1. OpenRouter   : openrouter/free (auto-routing)
 *   2. NVIDIA       : google/gemma-4-31b-it  →  mistralai/mistral-small-4-119b-2603
 *   3. DeepSeek     : deepseek-v4-flash
 *
 * Chaque fournisseur est testé indépendamment ; dès qu'une réponse OK est obtenue,
 * on la renvoie. Si toutes les clés sont absentes ou tous les appels échouent,
 * on renvoie `null` (la route appelante bascule alors sur son fallback offline).
 */

export interface OracleProvider {
  name: string;
  baseUrl: string;
  apiKey?: string;
  models: string[];
}

// --- Configuration des fournisseurs (clés via variables d'env, jamais en dur) ---
const PROVIDERS: OracleProvider[] = [
  {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: process.env.OPENROUTER_API_KEY,
    models: ['openrouter/free'],
  },
  {
    name: 'NVIDIA',
    baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
    apiKey: process.env.NVIDIA_API_KEY,
    models: ['google/gemma-4-31b-it', 'mistralai/mistral-small-4-119b-2603'],
  },
  {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: process.env.DEEPSEEK_API_KEY,
    models: ['deepseek-v4-flash'],
  },
];

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 30_000;
// Timeout réduit à 20s : les modèles flash répondent en ~1-5s, inutile d'attendre 75s
// alors qu'OpenRouter et NVIDIA sont souvent en échec.
const REQUEST_TIMEOUT_MS = 20_000;
const breaker: Record<string, { failures: number; blockedUntil: number }> = {};

function isBlocked(name: string): boolean {
  const b = breaker[name];
  if (!b) return false;
  if (b.blockedUntil > Date.now()) return true;
  if (b.blockedUntil) {
    // cooldown écoulé → reset automatique
    breaker[name] = { failures: 0, blockedUntil: 0 };
  }
  return false;
}

function recordFailure(name: string) {
  const b = breaker[name] || { failures: 0, blockedUntil: 0 };
  b.failures++;
  if (b.failures >= FAILURE_THRESHOLD) {
    b.blockedUntil = Date.now() + COOLDOWN_MS;
    console.warn(`[llm] Circuit breaker: ${name} désactivé ${COOLDOWN_MS / 1000}s (trop d'échecs 429/503)`);
  }
  breaker[name] = b;
}

function recordSuccess(name: string) {
  breaker[name] = { failures: 0, blockedUntil: 0 };
}

const SYSTEM_PROMPT =
  "Tu es un voyant et oracle d'une profonde empathie, au service corps et âme de celui qui consulte. LA QUESTION DE LA PERSONNE est ton guide absolu : chaque phrase doit lui répondre directement, PAS décrire des concepts astrologiques génériques sans lien avec sa situation. Suis scrupuleusement les instructions de format et de longueur données dans le message ci-dessous.";

/**
 * Tente d'obtenir une interprétation via la cascade de fournisseurs.
 * @param prompt Le prompt utilisateur (déjà construit par la route).
 * @param opts.maxTokens Tokens max (défaut 1200).
 * @returns Le contenu brut de l'IA (string), ou `null` si tout a échoué.
 */
export async function callOracle(
  prompt: string,
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<string | null> {
  const maxTokens = opts.maxTokens ?? 4000;
  const temperature = opts.temperature ?? 0.72;

  for (const provider of PROVIDERS) {
    if (!provider.apiKey) {
      console.warn(`[llm] ${provider.name}: clé API absente, fournisseur ignoré.`);
      continue;
    }
    if (isBlocked(provider.name)) {
      console.warn(`[llm] ${provider.name}: circuit breaker actif, fournisseur ignoré (cooldown).`);
      continue;
    }

    for (const model of provider.models) {
      try {
        console.log(`[llm] Tentative ${provider.name} / ${model}`);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        let res: Response;
        try {
          const apiKey = provider.apiKey;
          res = await fetch(provider.baseUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt },
              ],
              temperature,
              max_tokens: maxTokens,
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          console.warn(`[llm] ${provider.name} / ${model} échoué (${res.status}):`, errText.slice(0, 300));
          if (res.status === 429 || res.status === 503) recordFailure(provider.name);
          continue;
        }

        const data = await res.json();
        const msg = data?.choices?.[0]?.message ?? data?.message ?? {};
        // NE JAMAIS utiliser `reasoning` comme réponse finale : certains modèles
        // (DeepSeek, modèles de raisonnement OpenRouter) renvoient leur chaîne de
        // pensée dans `reasoning_content`/`reasoning` avec un `content` vide → on
        // afficherait le métatexte de raisonnement au lieu de l'interprétation.
        const content: string = msg?.content?.trim?.() ?? '';
        if (content && content.trim().length > 0) {
          // Ignorer les réponses du filtre sécurité d'OpenRouter (ex: "User Safety: safe")
          if (/^User Safety:\s/i.test(content.trim())) {
            console.warn(`[llm] ${provider.name} / ${model}: réponse filtrée par sécurité ("${content.trim().slice(0, 40)}"), bascule...`);
            continue;
          }
          // Ignorer le métatexte de raisonnement : certains modèles "pensent à voix
          // haute" dans content ("We need to respond to the user...", "Je dois
          // répondre...", etc.) au lieu de livrer l'interprétation demandée.
          if (/^(we need to respond|i need to respond|the user says|the user asked|the user is asking|let me (think|provide|write|start)|i'll (provide|write|start)|je dois (répondre|fournir|commencer)|je vais (répondre|fournir|analyser|commencer)|d'accord, (je )?(vais|analysons)|ok, (je )?(vais|analysons)|en tant qu'|voici (ma|une|mon)|réponse[:\s]).*$/i.test(content.trim())) {
            console.warn(`[llm] ${provider.name} / ${model}: métatexte de raisonnement détecté ("${content.trim().slice(0, 50)}"), bascule...`);
            continue;
          }
          console.log(`[llm] Succès via ${provider.name} / ${model} (${content.length} chars)`);
          recordSuccess(provider.name);
          return content;
        }
        console.warn(`[llm] ${provider.name} / ${model}: réponse vide.`);
      } catch (err) {
        const aborted = (err as Error)?.name === 'AbortError';
        console.error(`[llm] Erreur ${provider.name} / ${model}${aborted ? ' (timeout)' : ''}:`, err);
      }
    }
  }

  console.warn('[llm] Tous les fournisseurs ont échoué ou sont absents.');
  return null;
}

/**
 * Extrait un objet JSON valide depuis le contenu brut renvoyé par un LLM.
 * Robuste face aux sauts de ligne littéraux / caractères de contrôle que les
 * modèles insèrent parfois dans les chaînes (ce qui casse JSON.parse).
 *
 * @param content Contenu brut de l'IA (peut contenir du Markdown, du texte autour).
 * @returns L'objet JSON parsé, ou `{}` si aucun JSON valide n'a pu être extrait.
 */
export function extractJsonObject(content: string): Record<string, any> {
  if (!content || typeof content !== 'string') return {};

  let text = content.trim();

  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }

  text = text.replace(/[\x00-\x1f]/g, ' ');

  const start = text.indexOf('{');
  if (start < 0) return {};

  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (!inString) {
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
  }
  if (end < 0) return {};

  const jsonBlock = text.slice(start, end + 1);
  try {
    return JSON.parse(jsonBlock);
  } catch (e) {
    console.warn('[llm] extractJsonObject: échec du parse JSON:', (e as Error)?.message);
    return {};
  }
}
