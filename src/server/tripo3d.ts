import { loadIntegrations } from './integrations';

const API_BASE = 'https://api.tripo3d.ai/v2/openapi';

function apiKey() {
  return loadIntegrations().tripo3d.apiKey.trim();
}

export function tripo3dConfigured() {
  return Boolean(apiKey());
}

async function tripoFetch(pathname: string, init: RequestInit = {}) {
  const key = apiKey();
  if (!key) throw new Error('Tripo3D non configurato: manca la API key.');
  const res = await fetch(`${API_BASE}${pathname}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
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
    throw new Error(json?.message || `Tripo3D ${res.status}: ${text.slice(0, 200)}`);
  }
  return json;
}

/**
 * Avvia una generazione multiview (2-4 foto dello stesso piatto da angolazioni
 * diverse). Le foto devono essere raggiungibili da Internet (URL pubblici, es.
 * dishImageUrl() servito da /api/serve-image): Tripo3D le scarica lui stesso.
 * Ritorna subito il task_id: la generazione richiede secondi/minuti, va
 * interrogata dopo con getTaskStatus() (vedi model3dJobs.ts + il cron di polling).
 */
export async function submitMultiviewTask(imageUrls: string[]): Promise<string> {
  const files = imageUrls.map((url) => ({ type: 'jpg', url }));
  const json = await tripoFetch('/task', {
    method: 'POST',
    body: JSON.stringify({ type: 'multiview_to_model', files, texture: true }),
  });
  const taskId = json?.data?.task_id;
  if (!taskId) throw new Error('Tripo3D non ha restituito un task_id.');
  return taskId;
}

export type TripoTaskStatus = {
  status: 'queued' | 'running' | 'success' | 'failed' | 'unknown';
  progress?: number;
  modelUrl?: string;
};

export async function getTaskStatus(taskId: string): Promise<TripoTaskStatus> {
  const json = await tripoFetch(`/task/${encodeURIComponent(taskId)}`, { method: 'GET' });
  const data = json?.data || {};
  const rawStatus = String(data.status || '').toLowerCase();
  const status: TripoTaskStatus['status'] =
    rawStatus === 'success'
      ? 'success'
      : rawStatus === 'failed' || rawStatus === 'cancelled' || rawStatus === 'unknown'
        ? 'failed'
        : rawStatus === 'queued'
          ? 'queued'
          : 'running';
  return {
    status,
    progress: Number(data.progress) || undefined,
    modelUrl: data.output?.pbr_model || data.output?.model || undefined,
  };
}
