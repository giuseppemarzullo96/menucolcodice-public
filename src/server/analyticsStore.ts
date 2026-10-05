import fs from 'fs';
import path from 'path';
import { loadTenants, tenantDataDir } from './tenant';

export type DeviceKind = 'phone' | 'tablet' | 'desktop' | 'other';

export type AnalyticsEvent = {
  type: 'session_start' | 'page_view' | 'qr_scan' | 'dwell' | 'scroll' | 'dish_open' | 'category_view' | 'outbound';
  path?: string;
  dishId?: string;
  dishName?: string;
  category?: string;
  depth?: number;
  seconds?: number;
  target?: string;
  device?: DeviceKind;
};

export type DayStats = {
  sessions: number;
  pageViews: number;
  homeViews: number;
  menuViews: number;
  dishViews: number;
  qrScans: number;
  dishOpens: number;
  dwellMs: number;
  dwellCount: number;
  scroll25: number;
  scroll50: number;
  scroll75: number;
  scroll100: number;
  devices: Record<DeviceKind, number>;
  hours: Record<string, number>;
  dishes: Record<string, { name: string; count: number }>;
  categories: Record<string, number>;
  outbound: Record<string, number>;
};

export type AnalyticsFile = {
  days: Record<string, DayStats>;
};

const KEEP_DAYS = 120;

const emptyDay = (): DayStats => ({
  sessions: 0,
  pageViews: 0,
  homeViews: 0,
  menuViews: 0,
  dishViews: 0,
  qrScans: 0,
  dishOpens: 0,
  dwellMs: 0,
  dwellCount: 0,
  scroll25: 0,
  scroll50: 0,
  scroll75: 0,
  scroll100: 0,
  devices: { phone: 0, tablet: 0, desktop: 0, other: 0 },
  hours: {},
  dishes: {},
  categories: {},
  outbound: {},
});

function analyticsPath(slug?: string) {
  return path.join(tenantDataDir(slug), 'analytics', 'daily.json');
}

function loadFile(slug?: string): AnalyticsFile {
  const file = analyticsPath(slug);
  if (!fs.existsSync(file)) return { days: {} };
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!raw || typeof raw !== 'object' || typeof raw.days !== 'object') return { days: {} };
    return raw;
  } catch {
    return { days: {} };
  }
}

function saveFile(slug: string | undefined, data: AnalyticsFile) {
  const file = analyticsPath(slug);
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  const days: Record<string, DayStats> = {};
  Object.keys(data.days)
    .sort()
    .forEach((key) => {
      const ts = Date.parse(`${key}T12:00:00`);
      if (!Number.isNaN(ts) && ts >= cutoff) days[key] = data.days[key];
    });
  fs.writeFileSync(file, JSON.stringify({ days }, null, 2), 'utf8');
}

function dayKey(now = Date.now()) {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function clean(value: any, max = 80) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function classifyPath(rawPath: string) {
  const pathOnly = String(rawPath || '/').split('?')[0].split('#')[0] || '/';
  if (pathOnly === '/' || pathOnly === '/home') return 'home';
  if (pathOnly === '/dishes') return 'menu';
  if (pathOnly.startsWith('/dishes/')) return 'dish';
  return 'other';
}

function bump(map: Record<string, number>, key: string, by = 1) {
  if (!key) return;
  map[key] = (map[key] || 0) + by;
}

export function deviceFromUa(ua: string): DeviceKind {
  const text = String(ua || '').toLowerCase();
  if (!text) return 'other';
  if (/ipad|tablet/.test(text)) return 'tablet';
  if (/mobi|iphone|android/.test(text)) return 'phone';
  if (/windows|macintosh|linux|cros/.test(text)) return 'desktop';
  return 'other';
}

export function recordAnalyticsEvent(event: AnalyticsEvent, now = Date.now()) {
  const data = loadFile();
  const key = dayKey(now);
  const day = data.days[key] || emptyDay();
  const hour = String(new Date(now).getHours());
  const kind = classifyPath(event.path || '/');

  if (event.type === 'session_start') {
    day.sessions += 1;
    bump(day.hours, hour);
    const device = event.device || 'other';
    day.devices[device] = (day.devices[device] || 0) + 1;
  }

  if (event.type === 'page_view') {
    day.pageViews += 1;
    if (kind === 'home') day.homeViews += 1;
    if (kind === 'menu') day.menuViews += 1;
    if (kind === 'dish') day.dishViews += 1;
  }

  if (event.type === 'qr_scan') day.qrScans += 1;

  if (event.type === 'dwell') {
    const seconds = Math.max(0, Math.min(60 * 60, Number(event.seconds) || 0));
    if (seconds >= 1) {
      day.dwellMs += Math.round(seconds * 1000);
      day.dwellCount += 1;
    }
  }

  if (event.type === 'scroll') {
    const depth = Number(event.depth) || 0;
    if (depth >= 100) day.scroll100 += 1;
    else if (depth >= 75) day.scroll75 += 1;
    else if (depth >= 50) day.scroll50 += 1;
    else if (depth >= 25) day.scroll25 += 1;
  }

  if (event.type === 'dish_open') {
    day.dishOpens += 1;
    const id = clean(event.dishId, 40) || clean(event.dishName, 40);
    if (id) {
      const prev = day.dishes[id] || { name: clean(event.dishName, 80) || id, count: 0 };
      prev.count += 1;
      if (event.dishName) prev.name = clean(event.dishName, 80);
      day.dishes[id] = prev;
    }
  }

  if (event.type === 'category_view') {
    bump(day.categories, clean(event.category, 60));
  }

  if (event.type === 'outbound') {
    const target = clean(event.target, 24).toLowerCase();
    if (['whatsapp', 'glovo', 'deliveroo', 'justeat', 'facebook', 'instagram'].includes(target)) {
      bump(day.outbound, target);
    }
  }

  data.days[key] = day;
  saveFile(undefined, data);
}

function mergeDays(days: DayStats[]): DayStats {
  const out = emptyDay();
  days.forEach((day) => {
    out.sessions += day.sessions || 0;
    out.pageViews += day.pageViews || 0;
    out.homeViews += day.homeViews || 0;
    out.menuViews += day.menuViews || 0;
    out.dishViews += day.dishViews || 0;
    out.qrScans += day.qrScans || 0;
    out.dishOpens += day.dishOpens || 0;
    out.dwellMs += day.dwellMs || 0;
    out.dwellCount += day.dwellCount || 0;
    out.scroll25 += day.scroll25 || 0;
    out.scroll50 += day.scroll50 || 0;
    out.scroll75 += day.scroll75 || 0;
    out.scroll100 += day.scroll100 || 0;
    (Object.keys(out.devices) as DeviceKind[]).forEach((device) => {
      out.devices[device] += day.devices?.[device] || 0;
    });
    Object.entries(day.hours || {}).forEach(([hour, count]) => bump(out.hours, hour, count));
    Object.entries(day.dishes || {}).forEach(([id, row]) => {
      const prev = out.dishes[id] || { name: row.name, count: 0 };
      prev.count += row.count;
      if (row.name) prev.name = row.name;
      out.dishes[id] = prev;
    });
    Object.entries(day.categories || {}).forEach(([name, count]) => bump(out.categories, name, count));
    Object.entries(day.outbound || {}).forEach(([name, count]) => bump(out.outbound, name, count));
  });
  return out;
}

function rangeKeys(days: number) {
  const keys: string[] = [];
  const n = Math.max(1, Math.min(KEEP_DAYS, Math.round(days) || 30));
  for (let i = n - 1; i >= 0; i -= 1) {
    keys.push(dayKey(Date.now() - i * 24 * 60 * 60 * 1000));
  }
  return keys;
}

export function summarizeTenant(slug: string, days = 30) {
  const file = loadFile(slug);
  const keys = rangeKeys(days);
  const series = keys.map((key) => {
    const day = file.days[key] || emptyDay();
    return {
      day: key,
      sessions: day.sessions || 0,
      pageViews: day.pageViews || 0,
      qrScans: day.qrScans || 0,
      dishOpens: day.dishOpens || 0,
      avgDwellSec: day.dwellCount ? Math.round(day.dwellMs / day.dwellCount / 1000) : 0,
    };
  });
  const totals = mergeDays(keys.map((key) => file.days[key] || emptyDay()));
  const topDishes = Object.entries(totals.dishes)
    .map(([id, row]) => ({ id, name: row.name, count: row.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const topCategories = Object.entries(totals.categories)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: totals.hours[String(hour)] || 0,
  }));
  return {
    slug,
    days: keys.length,
    totals: {
      ...totals,
      avgDwellSec: totals.dwellCount ? Math.round(totals.dwellMs / totals.dwellCount / 1000) : 0,
    },
    series,
    topDishes,
    topCategories,
    hours,
    outbound: totals.outbound,
    devices: totals.devices,
  };
}

export function summarizePlatform(days = 30) {
  const summaries = loadTenants().map((tenant) => {
    const summary = summarizeTenant(tenant.slug, days);
    return {
      slug: tenant.slug,
      name: tenant.name,
      isDemo: tenant.slug === 'demo',
      sessions: summary.totals.sessions,
      pageViews: summary.totals.pageViews,
      qrScans: summary.totals.qrScans,
      dishOpens: summary.totals.dishOpens,
      avgDwellSec: summary.totals.avgDwellSec,
      menuViews: summary.totals.menuViews,
      dwellMs: summary.totals.dwellMs,
      dwellCount: summary.totals.dwellCount,
      series: summary.series,
    };
  });
  const clients = summaries.filter((row) => !row.isDemo);
  const sum = (key: 'sessions' | 'pageViews' | 'qrScans' | 'dishOpens' | 'menuViews') =>
    clients.reduce((acc, row) => acc + row[key], 0);
  const dwellMs = clients.reduce((acc, row) => acc + row.dwellMs, 0);
  const dwellCount = clients.reduce((acc, row) => acc + row.dwellCount, 0);
  const seriesMap: Record<string, { sessions: number; pageViews: number; qrScans: number }> = {};
  clients.forEach((row) => {
    row.series.forEach((point) => {
      const prev = seriesMap[point.day] || { sessions: 0, pageViews: 0, qrScans: 0 };
      prev.sessions += point.sessions;
      prev.pageViews += point.pageViews;
      prev.qrScans += point.qrScans;
      seriesMap[point.day] = prev;
    });
  });
  const keys = rangeKeys(days);
  return {
    days: keys.length,
    note: 'Conteggi nostri sui menu dei locali. Non sono i numeri di Google Analytics.',
    totals: {
      locali: clients.length,
      sessions: sum('sessions'),
      pageViews: sum('pageViews'),
      menuViews: sum('menuViews'),
      qrScans: sum('qrScans'),
      dishOpens: sum('dishOpens'),
      avgDwellSec: dwellCount ? Math.round(dwellMs / dwellCount / 1000) : 0,
    },
    series: keys.map((day) => ({
      day,
      ...(seriesMap[day] || { sessions: 0, pageViews: 0, qrScans: 0 }),
    })),
    locali: summaries
      .map((row) => ({
        slug: row.slug,
        name: row.name,
        isDemo: row.isDemo,
        sessions: row.sessions,
        pageViews: row.pageViews,
        qrScans: row.qrScans,
        dishOpens: row.dishOpens,
        avgDwellSec: row.avgDwellSec,
        menuViews: row.menuViews,
      }))
      .sort((a, b) => b.pageViews - a.pageViews),
  };
}
