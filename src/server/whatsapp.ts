import { loadIntegrations } from './integrations';
import { findTenantByWhatsApp, PLAN_LIMITS } from './tenant';
import sharp from 'sharp';

export type EvolutionMessage = {
  fromMe: boolean;
  remoteJid: string;
  number: string;
  text: string;
  hasImage: boolean;
  hasAudio: boolean;
  audioMime: string;
  pollOptions: string[];
  pollMessageId: string;
  raw: any;
};

export function normalizePhone(input: string): string {
  let phone = String(input || '')
    .replace(/@.*$/, '')
    .replace(/[^\d]/g, '')
    .replace(/^00/, '');
  if (phone.length === 10 && phone.startsWith('3')) phone = `39${phone}`;
  return phone;
}

export function isNumberAllowed(number: string): boolean {
  const tenant = findTenantByWhatsApp(number);
  if (tenant) {
    return tenant.status === 'active' && Boolean(PLAN_LIMITS[tenant.plan].whatsapp);
  }
  const cfg = loadIntegrations();
  const allowed = (cfg.evolution.allowedNumbers || []).map(normalizePhone).filter(Boolean);
  if (allowed.length === 0) return false;
  const n = normalizePhone(number);
  return allowed.some((a) => n.endsWith(a) || a.endsWith(n));
}

function evolutionBaseUrl() {
  const cfg = loadIntegrations();
  const raw = (cfg.evolution.baseUrl || '').trim().replace(/\/$/, '');
  if (/evolution\.giuseppemarzullo\.it$/i.test(raw.replace(/^https?:\/\//, '').split('/')[0])) {
    return 'http://127.0.0.1:8080';
  }
  return raw || 'http://127.0.0.1:8080';
}

function evolutionErrorMessage(status: number, json: any, text: string) {
  const nested = json?.response?.message;
  const detail = Array.isArray(nested) ? nested.join(' ') : nested || json?.message || json?.error || text.slice(0, 240);
  if (status === 401 || status === 403) {
    return 'Unauthorized: serve la API key globale del manager Evolution, non il token di un’istanza (es. brigata).';
  }
  if (status === 404) {
    return typeof detail === 'string' && detail.toLowerCase().includes('does not exist')
      ? 'Istanza non trovata. Premi di nuovo Salva per crearla.'
      : String(detail || 'Not Found');
  }
  return String(detail || `Evolution ${status}`);
}

async function evoFetch(pathname: string, init: RequestInit = {}) {
  const cfg = loadIntegrations();
  const url = `${evolutionBaseUrl()}${pathname}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: (cfg.evolution.apiKey || '').trim(),
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(evolutionErrorMessage(res.status, json, text));
  }
  return json;
}

export async function evolutionStatus() {
  const cfg = loadIntegrations();
  if (!cfg.evolution.apiKey) {
    return { configured: false, connected: false, message: 'Manca la API key di Evolution' };
  }
  try {
    const data = await evoFetch(`/instance/connectionState/${encodeURIComponent(cfg.evolution.instance)}`);
    const state = data?.instance?.state || data?.state || data?.status || '';
    return {
      configured: true,
      connected: String(state).toLowerCase() === 'open',
      state,
      instance: cfg.evolution.instance,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function evolutionQr() {
  const cfg = loadIntegrations();
  return evoFetch(`/instance/connect/${encodeURIComponent(cfg.evolution.instance)}`);
}

export function extractWhatsAppQr(payload: any) {
  const node = payload?.qrcode || payload?.qrCode || payload?.qr || payload;
  const code = typeof node?.code === 'string' ? node.code.trim() : '';
  const pairingCode = String(node?.pairingCode || payload?.pairingCode || '').trim();
  const raw = typeof node?.base64 === 'string' ? node.base64.trim() : '';
  const looksPng = raw.startsWith('data:image') || raw.startsWith('iVBOR');
  return {
    code: code.startsWith('2@') ? code : '',
    pairingCode,
    image: looksPng ? (raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`) : '',
    count: node?.count ?? null,
  };
}

export async function ensureEvolutionInstance() {
  const cfg = loadIntegrations();
  const name = encodeURIComponent(cfg.evolution.instance);
  try {
    await evoFetch(`/instance/connectionState/${name}`);
    return;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.startsWith('Unauthorized')) throw error;
    await evoFetch('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName: cfg.evolution.instance,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });
  }
}

export async function setEvolutionWebhook(webhookUrl: string) {
  const cfg = loadIntegrations();
  const instance = encodeURIComponent(cfg.evolution.instance);
  try {
    return await evoFetch(`/webhook/set/${instance}`, {
      method: 'POST',
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: true,
          events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE'],
        },
      }),
    });
  } catch {
    return evoFetch(`/webhook/set/${instance}`, {
      method: 'POST',
      body: JSON.stringify({
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        webhookBase64: true,
        events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE'],
      }),
    });
  }
}

export async function sendWhatsAppPoll(opts: {
  number: string;
  name: string;
  values: string[];
  selectableCount: number;
}) {
  const cfg = loadIntegrations();
  const phone = normalizePhone(opts.number);
  const values = Array.from(new Set(opts.values.map((v) => String(v).slice(0, 80)).filter(Boolean)));
  if (values.length < 2) {
    throw new Error('Il sondaggio richiede almeno 2 opzioni');
  }
  const result = await evoFetch(`/message/sendPoll/${encodeURIComponent(cfg.evolution.instance)}`, {
    method: 'POST',
    body: JSON.stringify({
      number: phone,
      name: opts.name.slice(0, 230),
      selectableCount: Math.max(1, Math.min(10, opts.selectableCount, values.length)),
      values: values.slice(0, 10),
    }),
  });
  const msgId =
    result?.key?.id ||
    result?.message?.key?.id ||
    result?.data?.key?.id ||
    result?.keyId ||
    '';
  return { result, msgId: String(msgId) };
}

function extractPollVotes(data: any): { options: string[]; pollMessageId: string } {
  const message = data?.message || {};
  const pollMessageId = String(
    message.pollUpdateMessage?.pollCreationMessageKey?.id ||
      data?.pollUpdateMessage?.pollCreationMessageKey?.id ||
      ''
  );
  const updates = data?.pollUpdates || message.pollUpdates || [];
  if (Array.isArray(updates) && updates.length > 0) {
    const selected = updates
      .filter((u: any) => Array.isArray(u?.voters) && u.voters.length > 0)
      .map((u: any) => String(u.name || '').trim())
      .filter(Boolean);
    return { options: selected, pollMessageId };
  }
  const selectedOptions =
    message.pollUpdateMessage?.vote?.selectedOptions ||
    data?.pollUpdateMessage?.vote?.selectedOptions ||
    [];
  if (Array.isArray(selectedOptions) && selectedOptions.length) {
    return {
      options: selectedOptions.map((x: any) => String(x?.name || x || '').trim()).filter(Boolean),
      pollMessageId,
    };
  }
  return { options: [], pollMessageId };
}

export async function sendWhatsAppImage(opts: {
  number: string;
  filePath?: string;
  caption?: string;
}) {
  const cfg = loadIntegrations();
  const phone = normalizePhone(opts.number);
  if (!opts.filePath) throw new Error('Manca il file immagine');
  const jpeg = await sharp(opts.filePath).rotate().jpeg({ quality: 78 }).toBuffer();
  return evoFetch(`/message/sendMedia/${encodeURIComponent(cfg.evolution.instance)}`, {
    method: 'POST',
    body: JSON.stringify({
      number: phone,
      mediatype: 'image',
      mimetype: 'image/jpeg',
      caption: (opts.caption || '').slice(0, 1000),
      media: jpeg.toString('base64'),
      fileName: 'sfondo.jpg',
    }),
  });
}

export async function sendWhatsAppSticker(opts: { number: string; stickerUrl: string }) {
  const cfg = loadIntegrations();
  const phone = normalizePhone(opts.number);
  const sticker = String(opts.stickerUrl || '').trim();
  if (!sticker) throw new Error('Manca l’URL dello sticker');
  return evoFetch(`/message/sendSticker/${encodeURIComponent(cfg.evolution.instance)}`, {
    method: 'POST',
    body: JSON.stringify({
      number: phone,
      sticker,
    }),
  });
}

export async function sendWhatsAppText(number: string, text: string) {
  const cfg = loadIntegrations();
  const phone = normalizePhone(number);
  return evoFetch(`/message/sendText/${encodeURIComponent(cfg.evolution.instance)}`, {
    method: 'POST',
    body: JSON.stringify({
      number: phone,
      text,
    }),
  });
}

export function parseIncomingMessage(body: any): EvolutionMessage | null {
  const data = Array.isArray(body?.data) ? body.data[0] : (body?.data || body);
  const key = data?.key || {};
  if (key.fromMe) return null;
  const remoteJid = String(key.remoteJid || '');
  if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') return null;

  const message = data?.message || {};
  const text =
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.documentMessage?.caption ||
    '';

  const hasImage = Boolean(
    message.imageMessage ||
      message.documentMessage?.mimetype?.startsWith('image/') ||
      data?.messageType === 'imageMessage'
  );

  const audioMsg = message.audioMessage || message.pttMessage || null;
  const hasAudio = Boolean(
    audioMsg ||
      String(data?.messageType || '').toLowerCase().includes('audio') ||
      message.documentMessage?.mimetype?.startsWith('audio/')
  );
  const audioMime = String(
    audioMsg?.mimetype || message.documentMessage?.mimetype || 'audio/ogg; codecs=opus'
  );

  const poll = extractPollVotes(data);
  const isPollUpdate = Boolean(
    message.pollUpdateMessage ||
      data?.pollUpdateMessage ||
      String(data?.messageType || '').toLowerCase().includes('poll')
  );
  if (!String(text || '').trim() && !hasImage && !hasAudio && poll.options.length === 0 && !isPollUpdate) return null;

  return {
    fromMe: false,
    remoteJid,
    number: normalizePhone(remoteJid),
    text: String(text || '').trim(),
    hasImage,
    hasAudio,
    audioMime,
    pollOptions: poll.options,
    pollMessageId: poll.pollMessageId,
    raw: data,
  };
}

export async function downloadIncomingImage(data: any): Promise<string | null> {
  const cfg = loadIntegrations();
  const payload = {
    message: data,
    convertToMp4: false,
  };
  try {
    const result = await evoFetch(
      `/chat/getBase64FromMediaMessage/${encodeURIComponent(cfg.evolution.instance)}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    const base64 = result?.base64 || result?.data?.base64;
    if (!base64) return null;
    return String(base64).replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
  } catch {
    return null;
  }
}

export async function downloadIncomingAudio(data: any): Promise<string | null> {
  try {
    const result = await evoFetch(
      `/chat/getBase64FromMediaMessage/${encodeURIComponent(loadIntegrations().evolution.instance)}`,
      {
        method: 'POST',
        body: JSON.stringify({ message: data, convertToMp4: false }),
      }
    );
    const base64 = result?.base64 || result?.data?.base64;
    if (!base64) return null;
    return String(base64).replace(/^data:[^;]+;base64,/, '');
  } catch {
    return null;
  }
}
