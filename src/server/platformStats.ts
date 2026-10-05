import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { PLAN_CATALOG } from '@/utils/plans';
import { listPendingSignups } from './signup';
import { fetchSubscriptionStatus } from './subscriptionBilling';
import { loadTenants, tenantDataDir, type PlanId, type TenantRecord } from './tenant';

export type LocaleRow = {
  slug: string;
  name: string;
  email: string;
  plan: PlanId;
  status: TenantRecord['status'];
  billingProvider: TenantRecord['billingProvider'];
  hasSubscription: boolean;
  products: number;
  categories: number;
  createdAt: number;
  lastEditAt: number;
  menuUrl: string;
  adminUrl: string;
  isDemo: boolean;
  cancelAtPeriodEnd: boolean;
  subscriptionEndsAt: number | null;
  cancellable: boolean;
};

function readTsExport(filePath: string, exportName: string) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const tsContent = fs.readFileSync(filePath, 'utf8');
    const jsContent = tsContent
      .replace(/^[ \t]*import[^;]+;\s*\n/gm, '')
      .replace(new RegExp(`export\\s+const\\s+${exportName}\\s*[:=]\\s*`), `exports.${exportName} = `)
      .replace(/PriceNameType\.([A-Z_]+)/g, '"$1"');
    const sandbox: any = { exports: {} };
    vm.createContext(sandbox);
    vm.runInContext(jsContent, sandbox, { filename: filePath });
    return sandbox.exports[exportName];
  } catch {
    return null;
  }
}

function dirStamp(dir: string) {
  if (!fs.existsSync(dir)) return 0;
  const files = [
    path.join(dir, 'menu', 'products.ts'),
    path.join(dir, 'menu', 'sections.ts'),
    path.join(dir, 'restaurant', 'info.ts'),
    path.join(dir, 'admin-config.json'),
  ];
  return files.reduce((max, file) => {
    if (!fs.existsSync(file)) return max;
    return Math.max(max, fs.statSync(file).mtimeMs);
  }, fs.statSync(dir).mtimeMs);
}

function localeRow(
  tenant: TenantRecord,
  billing?: { cancelAtPeriodEnd: boolean; subscriptionEndsAt: number | null; cancellable: boolean }
): LocaleRow {
  const dir = tenantDataDir(tenant.slug);
  const products = readTsExport(path.join(dir, 'menu', 'products.ts'), 'menuProducts');
  const sections = readTsExport(path.join(dir, 'menu', 'sections.ts'), 'menuSections');
  const createdAt = tenant.createdAt || dirStamp(dir);
  const hasSubscription = Boolean(
    (tenant.billingProvider === 'stripe' && tenant.stripeSubscriptionId) ||
      (tenant.billingProvider === 'paypal' && tenant.paypalSubscriptionId)
  );
  return {
    slug: tenant.slug,
    name: tenant.name,
    email: tenant.email || '',
    plan: tenant.plan,
    status: tenant.status,
    billingProvider: tenant.billingProvider,
    hasSubscription,
    products: Array.isArray(products) ? products.length : 0,
    categories: Array.isArray(sections) ? sections.length : 0,
    createdAt,
    lastEditAt: dirStamp(dir),
    menuUrl: `https://${tenant.slug}.menucolcodice.it`,
    adminUrl: `https://${tenant.slug}.menucolcodice.it/admin/login`,
    isDemo: tenant.slug === 'demo',
    cancelAtPeriodEnd: billing?.cancelAtPeriodEnd ?? Boolean(tenant.cancelAtPeriodEnd),
    subscriptionEndsAt:
      billing?.subscriptionEndsAt ??
      (tenant.subscriptionEndsAt ? tenant.subscriptionEndsAt : null),
    cancellable: billing?.cancellable ?? (hasSubscription && !tenant.cancelAtPeriodEnd),
  };
}

async function localeRowWithBilling(tenant: TenantRecord): Promise<LocaleRow> {
  const hasBilling =
    tenant.plan !== 'free' &&
    ((tenant.billingProvider === 'stripe' && tenant.stripeSubscriptionId) ||
      (tenant.billingProvider === 'paypal' && tenant.paypalSubscriptionId));
  if (!hasBilling) {
    return localeRow(tenant, { cancelAtPeriodEnd: false, subscriptionEndsAt: null, cancellable: false });
  }
  try {
    const sub = await fetchSubscriptionStatus(tenant);
    return localeRow(tenant, {
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      subscriptionEndsAt: sub.currentPeriodEnd,
      cancellable: sub.cancellable,
    });
  } catch {
    return localeRow(tenant);
  }
}

export async function getPlatformOverview() {
  const tenants = loadTenants();
  const all = await Promise.all(tenants.map(localeRowWithBilling));
  const clienti = all.filter((row) => !row.isDemo);
  const pending = listPendingSignups();
  const byPlan = {
    free: clienti.filter((row) => row.plan === 'free').length,
    medium: clienti.filter((row) => row.plan === 'medium').length,
    pro: clienti.filter((row) => row.plan === 'pro').length,
  };
  const monthlyIvaIncl = clienti.reduce((sum, row) => {
    if (row.status !== 'active') return sum;
    const catalog = PLAN_CATALOG.find((item) => item.id === row.plan);
    return sum + (catalog?.chargeEuro || 0);
  }, 0);

  return {
    generatedAt: Date.now(),
    note: 'Non misuriamo le visite al menu. Qui vedi locali iscritti, piani e quanto hanno compilato.',
    totals: {
      clienti: clienti.length,
      attivi: clienti.filter((row) => row.status === 'active').length,
      sospesi: clienti.filter((row) => row.status === 'suspended').length,
      pendingPaypal: pending.length,
      piatti: clienti.reduce((sum, row) => sum + row.products, 0),
      monthlyIvaIncl: Math.round(monthlyIvaIncl * 100) / 100,
      byPlan,
    },
    pending: pending.map((row) => ({
      slug: row.slug,
      name: row.name,
      email: row.email,
      plan: row.plan,
      paypalSubscriptionId: row.paypalSubscriptionId || '',
      stripeSessionId: row.stripeSessionId || '',
      createdAt: row.createdAt,
    })),
    locali: all.sort((a, b) => b.createdAt - a.createdAt),
  };
}
