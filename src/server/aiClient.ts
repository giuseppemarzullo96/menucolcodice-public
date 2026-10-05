import { loadIntegrations } from './integrations';

/**
 * Trova il primo oggetto JSON bilanciato nel testo, invece di tagliare dalla prima "{"
 * all'ultima "}" del testo intero. Quest'ultimo approccio prende la graffa sbagliata
 * quando il modello aggiunge testo prima/dopo il JSON (es. "Ecco il risultato: {...}
 * Nota: ...") o quando la risposta è troncata: in entrambi i casi produceva un JSON
 * apparentemente valido ma corrotto invece di fallire in modo pulito.
 */
function findBalancedJson(text: string): string | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function extractJson(text: string): any {
  const trimmed = (text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : trimmed;
  const jsonSlice = findBalancedJson(raw);
  if (!jsonSlice) throw new Error('La risposta AI non contiene JSON');
  return JSON.parse(jsonSlice);
}

export async function chatCompletions(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: any[];
  timeoutMs?: number;
  temperature?: number;
}): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs || 90000);
  try {
    const res = await fetch(`${opts.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model,
        temperature: opts.temperature ?? 0.1,
        response_format: { type: 'json_object' },
        messages: opts.messages,
      }),
    });
    const body = await res.text();
    let json: any = null;
    try {
      json = body ? JSON.parse(body) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      const errMsg = json?.error?.message || json?.message || body.slice(0, 300);
      throw new Error(`${opts.baseUrl.includes('deepseek') ? 'DeepSeek' : 'OpenAI'} ${res.status}: ${errMsg}`);
    }
    return json?.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timer);
  }
}

export async function openaiJson(messages: any[], opts?: { timeoutMs?: number; temperature?: number }) {
  const cfg = loadIntegrations();
  if (!cfg.openai.apiKey) throw new Error('Manca la OpenAI API key');
  return chatCompletions({
    baseUrl: 'https://api.openai.com/v1',
    apiKey: cfg.openai.apiKey,
    model: cfg.openai.model || 'gpt-4o-mini',
    messages,
    timeoutMs: opts?.timeoutMs || 25000,
    temperature: opts?.temperature ?? 0.15,
  });
}

export async function deepseekJson(messages: any[], opts?: { timeoutMs?: number }) {
  const cfg = loadIntegrations();
  if (!cfg.deepseek.apiKey) return '';
  return chatCompletions({
    baseUrl: 'https://api.deepseek.com',
    apiKey: cfg.deepseek.apiKey,
    model: cfg.deepseek.model || 'deepseek-v4-flash',
    messages,
    timeoutMs: opts?.timeoutMs || 20000,
    temperature: 0.1,
  });
}

export function hasOpenAiKey() {
  return Boolean(loadIntegrations().openai.apiKey);
}
