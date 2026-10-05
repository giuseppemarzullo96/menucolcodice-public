import fs from 'fs';
import path from 'path';

export type AiUsageKind = 'ocr' | 'whisper' | 'openai' | 'deepseek' | 'brand' | 'model3d';

export type AiUsageEvent = {
  at: number;
  slug: string;
  kind: AiUsageKind;
  provider?: 'openai' | 'deepseek';
  model?: string;
  pages?: number;
  note?: string;
};

type MonthBucket = {
  ocr: number;
  whisper: number;
  openai: number;
  deepseek: number;
  model3d: number;
};

type TenantUsageFile = {
  months: Record<string, MonthBucket>;
};

type PlatformMonthFile = {
  month: string;
  tenants: Record<string, MonthBucket>;
  recent: AiUsageEvent[];
};

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function emptyBucket(): MonthBucket {
  return { ocr: 0, whisper: 0, openai: 0, deepseek: 0, model3d: 0 };
}

function resolveTenantDir(slug: string) {
  if (slug === 'demo') return path.join(process.cwd(), 'database');
  return path.join(process.cwd(), 'tenants', slug);
}

function tenantUsagePath(slug: string) {
  return path.join(resolveTenantDir(slug), 'ai-usage.json');
}

function platformMonthPath(month = monthKey()) {
  const dir = path.join(process.cwd(), 'platform', 'ai-usage');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${month}.json`);
}

function loadTenantUsage(slug: string): TenantUsageFile {
  const file = tenantUsagePath(slug);
  if (!fs.existsSync(file)) return { months: {} };
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { months: raw.months && typeof raw.months === 'object' ? raw.months : {} };
  } catch {
    return { months: {} };
  }
}

function saveTenantUsage(slug: string, data: TenantUsageFile) {
  const file = tenantUsagePath(slug);
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function loadPlatformMonth(month = monthKey()): PlatformMonthFile {
  const file = platformMonthPath(month);
  if (!fs.existsSync(file)) return { month, tenants: {}, recent: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      month,
      tenants: raw.tenants && typeof raw.tenants === 'object' ? raw.tenants : {},
      recent: Array.isArray(raw.recent) ? raw.recent : [],
    };
  } catch {
    return { month, tenants: {}, recent: [] };
  }
}

function savePlatformMonth(data: PlatformMonthFile) {
  fs.writeFileSync(platformMonthPath(data.month), JSON.stringify(data, null, 2), 'utf8');
}

function bumpBucket(bucket: MonthBucket, event: { kind: AiUsageKind; provider?: string; pages?: number }) {
  const pages = Math.max(0, Number(event.pages) || 0);
  if (event.kind === 'ocr') bucket.ocr += pages || 1;
  if (event.kind === 'whisper') bucket.whisper += 1;
  if (event.kind === 'model3d') bucket.model3d += 1;
  if (event.kind === 'openai' || event.provider === 'openai') bucket.openai += 1;
  if (event.kind === 'deepseek' || event.provider === 'deepseek') bucket.deepseek += 1;
  if (event.kind === 'brand' && event.provider === 'openai') bucket.openai += 1;
  if (event.kind === 'brand' && event.provider === 'deepseek') bucket.deepseek += 1;
  return bucket;
}

export function currentMonthKey() {
  return monthKey();
}

export function getTenantOcrUsage(slug: string, month = monthKey()) {
  const data = loadTenantUsage(slug);
  return Number(data.months[month]?.ocr || 0);
}

export function getTenantModel3dUsage(slug: string, month = monthKey()) {
  const data = loadTenantUsage(slug);
  return Number(data.months[month]?.model3d || 0);
}

export function getTenantMonthUsage(slug: string, month = monthKey()): MonthBucket {
  const data = loadTenantUsage(slug);
  return { ...emptyBucket(), ...(data.months[month] || {}) };
}

export function recordAiUsage(event: {
  slug: string;
  kind: AiUsageKind;
  provider?: 'openai' | 'deepseek';
  model?: string;
  pages?: number;
  note?: string;
  at?: number;
}) {
  const slug = String(event.slug || 'unknown');
  const month = monthKey();
  const at = event.at || Date.now();
  const pages = Math.max(0, Number(event.pages) || 0);

  const tenantFile = loadTenantUsage(slug);
  const bucket = bumpBucket({ ...emptyBucket(), ...(tenantFile.months[month] || {}) }, event);
  tenantFile.months[month] = bucket;
  saveTenantUsage(slug, tenantFile);

  const platform = loadPlatformMonth(month);
  platform.tenants[slug] = bumpBucket({ ...emptyBucket(), ...(platform.tenants[slug] || {}) }, event);
  platform.recent = [
    {
      at,
      slug,
      kind: event.kind,
      provider: event.provider,
      model: event.model,
      pages: pages || undefined,
      note: event.note,
    },
    ...platform.recent,
  ].slice(0, 300);
  savePlatformMonth(platform);

  return bucket;
}

export function summarizePlatformAiUsage(month = monthKey()) {
  const data = loadPlatformMonth(month);
  const totals = emptyBucket();
  const locali = Object.entries(data.tenants).map(([slug, usage]) => {
    totals.ocr += usage.ocr || 0;
    totals.whisper += usage.whisper || 0;
    totals.openai += usage.openai || 0;
    totals.deepseek += usage.deepseek || 0;
    totals.model3d += usage.model3d || 0;
    return { slug, ...usage };
  });
  locali.sort((a, b) => (b.ocr || 0) - (a.ocr || 0));
  return {
    month,
    totals,
    locali,
    recent: data.recent.slice(0, 40),
  };
}
