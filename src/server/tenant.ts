import { AsyncLocalStorage } from 'async_hooks';
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { currentMonthKey, getTenantOcrUsage, getTenantModel3dUsage } from './aiUsageStore';

export type PlanId = 'free' | 'medium' | 'pro';
export type BillingProvider = 'paypal' | 'stripe' | 'none';

export type TenantRecord = {
  slug: string;
  name: string;
  plan: PlanId;
  status: 'active' | 'suspended';
  billingProvider: BillingProvider;
  whatsappNumbers: string[];
  email?: string;
  phone?: string;
  promoCodeUsed?: string;
  paypalSubscriptionId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSessionId?: string;
  createdAt?: number;
  /** Stripe: disdetta programmata, piano attivo fino a subscriptionEndsAt */
  cancelAtPeriodEnd?: boolean;
  subscriptionEndsAt?: number;
};

export const PLAN_LIMITS = {
  free: {
    maxProducts: 30,
    maxCategories: 5,
    ocr: false,
    whatsapp: false,
    analytics: false,
    model3d: false,
    ocrPerMonth: 0,
    model3dPerMonth: 0,
  },
  medium: {
    maxProducts: Number.MAX_SAFE_INTEGER,
    maxCategories: Number.MAX_SAFE_INTEGER,
    ocr: false,
    whatsapp: false,
    analytics: true,
    model3d: false,
    ocrPerMonth: 0,
    model3dPerMonth: 0,
  },
  pro: {
    maxProducts: Number.MAX_SAFE_INTEGER,
    maxCategories: Number.MAX_SAFE_INTEGER,
    ocr: true,
    whatsapp: true,
    analytics: true,
    model3d: true,
    ocrPerMonth: 100,
    model3dPerMonth: 10,
  },
} as const;

export class PlanLimitError extends Error {
  code = 'PLAN_LIMIT';
  constructor(message: string) {
    super(message);
    this.name = 'PlanLimitError';
  }
}

const RESERVED = new Set([
  'www', 'mail', 'webmail', 'ftp', 'ns', 'ipv4', 'webstat', 'admin', 'api', 'static', 'platform', 'app', 'demo',
]);

const als = new AsyncLocalStorage<TenantRecord>();

function platformDir() {
  return path.join(process.cwd(), 'platform');
}

function tenantsFile() {
  return path.join(platformDir(), 'tenants.json');
}

export function normalizePhone(value: string) {
  return String(value || '').replace(/[^\d]/g, '').replace(/^00/, '');
}

function resolveBillingProvider(item: Partial<TenantRecord>): BillingProvider {
  if (item.billingProvider === 'stripe' || item.billingProvider === 'paypal' || item.billingProvider === 'none') {
    return item.billingProvider;
  }
  if (item.stripeSubscriptionId || item.stripeCustomerId) return 'stripe';
  if (item.paypalSubscriptionId) return 'paypal';
  return 'none';
}

function defaultTenants(): TenantRecord[] {
  return [
    {
      slug: 'demo',
      name: 'Demo',
      plan: 'pro',
      status: 'active',
      billingProvider: 'none',
      whatsappNumbers: ['393330000000', '393330000005'],
    },
  ];
}

export function loadTenants(): TenantRecord[] {
  const file = tenantsFile();
  if (!fs.existsSync(file)) {
    const list = defaultTenants();
    saveTenants(list);
    return list;
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = Array.isArray(raw.tenants) ? raw.tenants : defaultTenants();
  return list.map((item: TenantRecord) => ({
    slug: String(item.slug || '').toLowerCase(),
    name: item.name || item.slug,
    plan: item.plan === 'medium' || item.plan === 'pro' || item.plan === 'free' ? item.plan : 'free',
    status: item.status === 'suspended' ? 'suspended' : 'active',
    billingProvider: resolveBillingProvider(item),
    whatsappNumbers: Array.isArray(item.whatsappNumbers) ? item.whatsappNumbers.map(normalizePhone).filter(Boolean) : [],
    email: item.email || '',
    phone: item.phone || '',
    promoCodeUsed: item.promoCodeUsed || '',
    paypalSubscriptionId: item.paypalSubscriptionId || '',
    stripeCustomerId: item.stripeCustomerId || '',
    stripeSubscriptionId: item.stripeSubscriptionId || '',
    stripeSessionId: item.stripeSessionId || '',
    createdAt: Number(item.createdAt) || 0,
    cancelAtPeriodEnd: Boolean(item.cancelAtPeriodEnd),
    subscriptionEndsAt: Number(item.subscriptionEndsAt) || undefined,
  }));
}

export function saveTenants(tenants: TenantRecord[]) {
  fs.mkdirSync(platformDir(), { recursive: true });
  fs.writeFileSync(tenantsFile(), JSON.stringify({ tenants }, null, 2), 'utf8');
}

export function getTenantBySlug(slug: string): TenantRecord | null {
  const needle = String(slug || '').toLowerCase().trim();
  return loadTenants().find((t) => t.slug === needle) || null;
}

export class WhatsAppNumberTakenError extends Error {
  code = 'WHATSAPP_TAKEN';
  constructor(public takenBy: string) {
    super(`Questo numero è già collegato a un altro menu (${takenBy}). Un cellulare può gestire un solo locale.`);
    this.name = 'WhatsAppNumberTakenError';
  }
}

export function findTenantByWhatsApp(number: string): TenantRecord | null {
  const phone = normalizePhone(number);
  if (!phone) return null;
  return loadTenants().find((t) => t.whatsappNumbers.includes(phone)) || null;
}

export function assertWhatsAppNumbersFree(slug: string, numbers: string[]) {
  const phones = Array.from(new Set(numbers.map(normalizePhone).filter(Boolean))).slice(0, 3);
  const others = loadTenants().filter((item) => item.slug !== slug);
  for (const phone of phones) {
    const owner = others.find((item) => item.whatsappNumbers.includes(phone));
    if (owner) throw new WhatsAppNumberTakenError(owner.slug);
  }
  return phones;
}

export function slugFromHost(hostHeader?: string | string[] | null): string {
  const raw = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader || '';
  const host = raw.split(':')[0].toLowerCase().trim();
  if (!host || host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return 'demo';
  }
  const parts = host.split('.');
  if (parts.length >= 3 && parts.slice(-2).join('.') === 'menucolcodice.it') {
    const sub = parts[0];
    if (sub === 'www' || sub === 'webmail') return 'demo';
    if (!RESERVED.has(sub)) return sub;
  }
  return 'demo';
}

export function currentTenant(): TenantRecord {
  return als.getStore() || getTenantBySlug('demo') || defaultTenants()[0];
}

export function currentPlanLimits() {
  return PLAN_LIMITS[currentTenant().plan] || PLAN_LIMITS.free;
}

export function isPlatformHost() {
  return currentTenant().slug === 'demo';
}

export function tenantDataDir(slug?: string) {
  const s = slug || currentTenant().slug;
  if (s === 'demo') return path.join(process.cwd(), 'database');
  return path.join(process.cwd(), 'tenants', s);
}

export function enterTenant(tenant: TenantRecord) {
  als.enterWith(tenant);
}

export function resolveTenantFromRequest(req: { headers: Record<string, any> }): TenantRecord | null {
  const headerSlug = String(req.headers['x-tenant-slug'] || '').trim().toLowerCase();
  const slug = headerSlug || slugFromHost(req.headers.host);
  return getTenantBySlug(slug);
}

export function enterTenantFromRequest(req: { headers: Record<string, any> }): TenantRecord {
  const tenant = resolveTenantFromRequest(req) || getTenantBySlug('demo') || defaultTenants()[0];
  enterTenant(tenant);
  return tenant;
}

export function withTenantPage<T>(req: { headers: Record<string, any> } | undefined, fn: () => T): T {
  if (req) enterTenantFromRequest(req);
  else enterTenant(getTenantBySlug('demo') || defaultTenants()[0]);
  return fn();
}

export function withTenantApi(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const tenant = resolveTenantFromRequest(req);
    if (!tenant) {
      return res.status(404).json({ message: 'Locale non trovato' });
    }
    if (tenant.status === 'suspended') {
      return res.status(403).json({ message: 'Locale sospeso' });
    }
    enterTenant(tenant);
    return handler(req, res);
  };
}

export function tenantPublic(tenant = currentTenant()) {
  const limits = PLAN_LIMITS[tenant.plan];
  const ocrPerMonth = Number(limits.ocrPerMonth || 0);
  const ocrUsed = limits.ocr ? getTenantOcrUsage(tenant.slug) : 0;
  return {
    slug: tenant.slug,
    name: tenant.name,
    plan: tenant.plan,
    billingProvider: tenant.billingProvider,
    ocr: Boolean(limits.ocr),
    whatsapp: Boolean(limits.whatsapp),
    analytics: Boolean(limits.analytics),
    model3d: Boolean(limits.model3d),
    maxProducts: limits.maxProducts,
    maxCategories: limits.maxCategories,
    ocrPerMonth,
    ocrUsedMonth: ocrUsed,
    ocrRemainingMonth: limits.ocr ? Math.max(0, ocrPerMonth - ocrUsed) : 0,
    ocrMonth: currentMonthKey(),
    whatsappNumbers: tenant.whatsappNumbers,
    isPlatform: tenant.slug === 'demo',
  };
}

export function assertProductLimit(count: number) {
  const max = currentPlanLimits().maxProducts;
  if (count > max) {
    throw new PlanLimitError(`Il piano Free consente al massimo ${max} piatti. Passa a Media o Pro per togliere il limite.`);
  }
}

export function assertCategoryLimit(count: number) {
  const max = currentPlanLimits().maxCategories;
  if (count > max) {
    throw new PlanLimitError(`Il piano Free consente al massimo ${max} categorie. Passa a Media o Pro per togliere il limite.`);
  }
}

export function assertOcrAllowed() {
  if (!currentPlanLimits().ocr) {
    throw new PlanLimitError('La scansione del menu cartaceo è disponibile solo nel piano Pro.');
  }
}

/** Controlla che restino abbastanza scansioni nel mese (1 pagina = 1 scansione). */
export function assertOcrScanQuota(pages: number) {
  assertOcrAllowed();
  const tenant = currentTenant();
  const limit = Number(currentPlanLimits().ocrPerMonth || 0);
  if (!limit || limit >= Number.MAX_SAFE_INTEGER) return;
  const used = getTenantOcrUsage(tenant.slug);
  const need = Math.max(1, Math.floor(Number(pages) || 1));
  if (used + need > limit) {
    const left = Math.max(0, limit - used);
    throw new PlanLimitError(
      left === 0
        ? `Hai raggiunto il limite di ${limit} scansioni menu di questo mese. Riprova il mese prossimo.`
        : `Ti restano solo ${left} scansioni questo mese, ma ne stai chiedendo ${need}. Riduci le foto o riprova il mese prossimo.`
    );
  }
}

/** Controlla che resti almeno una generazione 3D nel mese. */
export function assertModel3dQuota() {
  assertModel3dAllowed();
  const tenant = currentTenant();
  const limit = Number(currentPlanLimits().model3dPerMonth || 0);
  if (!limit || limit >= Number.MAX_SAFE_INTEGER) return;
  const used = getTenantModel3dUsage(tenant.slug);
  if (used >= limit) {
    throw new PlanLimitError(`Hai raggiunto il limite di ${limit} modelli 3D di questo mese. Riprova il mese prossimo.`);
  }
}

export function assertWhatsAppAllowed() {
  if (!currentPlanLimits().whatsapp) {
    throw new PlanLimitError('La gestione via WhatsApp è disponibile solo nel piano Pro.');
  }
}

export function assertAnalyticsAllowed() {
  if (!currentPlanLimits().analytics) {
    throw new PlanLimitError('Le statistiche sono disponibili dal piano Media in su.');
  }
}

export function assertModel3dAllowed() {
  if (!currentPlanLimits().model3d) {
    throw new PlanLimitError('I modelli 3D dei piatti sono disponibili solo nel piano Pro.');
  }
}

export function patchTenant(slug: string, patch: Partial<TenantRecord>) {
  const tenants = loadTenants();
  const index = tenants.findIndex((t) => t.slug === slug);
  if (index < 0) return null;
  tenants[index] = {
    ...tenants[index],
    ...patch,
    slug: tenants[index].slug,
    billingProvider: patch.billingProvider || tenants[index].billingProvider || resolveBillingProvider({ ...tenants[index], ...patch }),
  };
  if (patch.whatsappNumbers) {
    tenants[index].whatsappNumbers = assertWhatsAppNumbersFree(slug, patch.whatsappNumbers);
  }
  saveTenants(tenants);
  const next = tenants[index];
  if (als.getStore()?.slug === slug) enterTenant(next);
  return next;
}

export function removeTenant(slug: string) {
  const clean = String(slug || '').toLowerCase().trim();
  if (!clean || clean === 'demo') throw new Error('Questo locale non si può cancellare');
  saveTenants(loadTenants().filter((item) => item.slug !== clean));
  const dir = tenantDataDir(clean);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

export function isValidSlug(slug: string) {
  return /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(slug) && !RESERVED.has(slug);
}

export function provisionTenant(opts: {
  slug: string;
  name: string;
  plan?: PlanId;
  email?: string;
  phone?: string;
  promoCodeUsed?: string;
  billingProvider?: BillingProvider;
  paypalSubscriptionId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSessionId?: string;
}) {
  const slug = opts.slug.toLowerCase().trim();
  if (!isValidSlug(slug)) throw new Error('Sottodominio non valido');
  const existing = getTenantBySlug(slug);
  if (existing) {
    const plan = opts.plan || existing.plan;
    const phone = normalizePhone(opts.phone || existing.phone || '');
    const patch: Partial<TenantRecord> = {
      name: opts.name || existing.name,
      plan,
      email: opts.email || existing.email,
      phone: phone || existing.phone,
      promoCodeUsed: opts.promoCodeUsed || existing.promoCodeUsed,
      billingProvider: opts.billingProvider || existing.billingProvider,
      paypalSubscriptionId: opts.paypalSubscriptionId || existing.paypalSubscriptionId,
      stripeCustomerId: opts.stripeCustomerId || existing.stripeCustomerId,
      stripeSubscriptionId: opts.stripeSubscriptionId || existing.stripeSubscriptionId,
      stripeSessionId: opts.stripeSessionId || existing.stripeSessionId,
    };
    if (plan === 'pro' && phone && !existing.whatsappNumbers?.length) {
      patch.whatsappNumbers = assertWhatsAppNumbersFree(slug, [phone]);
    }
    return patchTenant(slug, patch) || existing;
  }
  const dest = tenantDataDir(slug);
  const template = path.join(process.cwd(), 'tenants', '_template');
  fs.mkdirSync(dest, { recursive: true });
  if (fs.existsSync(template)) {
    fs.cpSync(template, dest, { recursive: true });
  }
  const infoPath = path.join(dest, 'restaurant', 'info.ts');
  if (fs.existsSync(infoPath)) {
    const info = fs.readFileSync(infoPath, 'utf8').replace(/Nuovo locale/g, opts.name.replace(/"/g, ''));
    fs.writeFileSync(infoPath, info, 'utf8');
  }
  const adminConfigPath = path.join(dest, 'admin-config.json');
  if (fs.existsSync(adminConfigPath)) fs.unlinkSync(adminConfigPath);
  const phone = normalizePhone(opts.phone || '');
  const plan = opts.plan || 'free';
  if (phone) {
    const contactsPath = path.join(dest, 'restaurant', 'contacts.ts');
    if (fs.existsSync(contactsPath)) {
      const contacts = fs.readFileSync(contactsPath, 'utf8').replace(/phone:\s*""/, `phone: "${phone}"`);
      fs.writeFileSync(contactsPath, contacts, 'utf8');
    }
  }
  const tenants = loadTenants();
  const whatsappNumbers =
    plan === 'pro' && phone ? assertWhatsAppNumbersFree(slug, [phone]) : [];
  const record: TenantRecord = {
    slug,
    name: opts.name,
    plan,
    status: 'active',
    billingProvider:
      opts.billingProvider ||
      (opts.paypalSubscriptionId
        ? 'paypal'
        : opts.stripeSubscriptionId || opts.stripeSessionId
          ? 'stripe'
          : 'none'),
    whatsappNumbers,
    email: opts.email || '',
    phone: phone || '',
    promoCodeUsed: opts.promoCodeUsed || '',
    paypalSubscriptionId: opts.paypalSubscriptionId || '',
    stripeCustomerId: opts.stripeCustomerId || '',
    stripeSubscriptionId: opts.stripeSubscriptionId || '',
    stripeSessionId: opts.stripeSessionId || '',
    createdAt: Date.now(),
  };
  tenants.push(record);
  saveTenants(tenants);
  return record;
}
