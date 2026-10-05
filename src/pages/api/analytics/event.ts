import type { NextApiRequest, NextApiResponse } from 'next';
import { currentTenant, withTenantApi } from '@/server/tenant';
import { deviceFromUa, recordAnalyticsEvent, type AnalyticsEvent } from '@/server/analyticsStore';
import { isAdminAppPath, isMarketingHost, isMarketingPath } from '@/utils/hosts';

const ALLOWED = new Set([
  'session_start',
  'page_view',
  'qr_scan',
  'dwell',
  'scroll',
  'dish_open',
  'category_view',
  'outbound',
]);

const buckets = new Map<string, { n: number; t: number }>();

function clientIp(req: NextApiRequest) {
  const forwarded = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  return forwarded || String(req.socket.remoteAddress || 'unknown');
}

function limited(ip: string) {
  const now = Date.now();
  const row = buckets.get(ip);
  if (!row || now - row.t > 60_000) {
    buckets.set(ip, { n: 1, t: now });
    return false;
  }
  row.n += 1;
  return row.n > 80;
}

function skipPath(pathName: string) {
  const pathOnly = String(pathName || '/').split('?')[0];
  return (
    isAdminAppPath(pathOnly) ||
    isMarketingPath(pathOnly) ||
    pathOnly === '/qr' ||
    pathOnly.startsWith('/api')
  );
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (isMarketingHost(req.headers.host)) return res.status(204).end();
  if (!currentTenant()) return res.status(204).end();
  if (limited(clientIp(req))) return res.status(429).json({ ok: false });

  const bodyRaw = req.body;
  const body = typeof bodyRaw === 'string' ? (() => {
    try {
      return JSON.parse(bodyRaw);
    } catch {
      return {};
    }
  })() : (bodyRaw || {});
  const type = String(body.type || '');
  if (!ALLOWED.has(type)) return res.status(400).json({ ok: false });

  const eventPath = String(body.path || '/').slice(0, 180);
  if (skipPath(eventPath)) return res.status(204).end();

  const event: AnalyticsEvent = {
    type: type as AnalyticsEvent['type'],
    path: eventPath,
    dishId: String(body.dishId || '').slice(0, 40),
    dishName: String(body.dishName || '').slice(0, 80),
    category: String(body.category || '').slice(0, 60),
    depth: Number(body.depth) || 0,
    seconds: Number(body.seconds) || 0,
    target: String(body.target || '').slice(0, 24),
    device: deviceFromUa(String(req.headers['user-agent'] || '')),
  };

  try {
    recordAnalyticsEvent(event);
  } catch (error) {
    console.error('Analytics event failed', error);
  }
  return res.status(204).end();
}

export default withTenantApi(handler);
