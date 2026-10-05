import fs from 'fs';
import path from 'path';
import { PLAN_CATALOG, type CatalogPlanId } from '@/utils/plans';
import type { PlanId } from './tenant';

export type PromoCodeType = 'percent' | 'free_months' | 'free_year';

export type PromoCode = {
  id: string;
  code: string;
  type: PromoCodeType;
  value: number;
  label: string;
  active: boolean;
  expiresAt: number | null;
  maxUses: number | null;
  usedCount: number;
  plans: PlanId[];
  createdAt: number;
};

export type ResolvedPromo = {
  code: string;
  type: PromoCodeType;
  value: number;
  label: string;
  trialDays: number;
  discountedChargeEuro: number;
  paypalStartDelayDays: number;
};

const FILE = path.join(process.cwd(), 'platform', 'promo-codes.json');

function loadAll(): PromoCode[] {
  if (!fs.existsSync(FILE)) return [];
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  return Array.isArray(raw.codes) ? raw.codes : [];
}

function saveAll(codes: PromoCode[]) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify({ codes }, null, 2), 'utf8');
}

export function listPromoCodes() {
  return loadAll().sort((a, b) => b.createdAt - a.createdAt);
}

function normalizeCode(code: string) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');
}

function planChargeEuro(plan: CatalogPlanId) {
  return PLAN_CATALOG.find((item) => item.id === plan)?.chargeEuro || 0;
}

export function discountedChargeEuro(plan: CatalogPlanId, promo: Pick<PromoCode, 'type' | 'value'> | null) {
  const base = planChargeEuro(plan);
  if (!promo || promo.type !== 'percent') return base;
  return Math.round(base * (1 - promo.value / 100) * 100) / 100;
}

export function discountedChargeCents(plan: CatalogPlanId, promo: Pick<PromoCode, 'type' | 'value'> | null) {
  return Math.round(discountedChargeEuro(plan, promo) * 100);
}

function promoLabel(row: PromoCode, plan?: CatalogPlanId) {
  if (row.label) return row.label;
  if (row.type === 'percent') {
    const base = plan ? planChargeEuro(plan) : 0;
    const discounted = discountedChargeEuro(plan || 'medium', row);
    if (plan && discounted < base) {
      return `${row.value}% di sconto (€${discounted.toFixed(2)}/mese invece di €${base.toFixed(2)})`;
    }
    return `${row.value}% di sconto`;
  }
  if (row.type === 'free_year') return '1 anno gratis';
  return `${row.value} ${row.value === 1 ? 'mese' : 'mesi'} gratis`;
}

function trialDaysFor(row: PromoCode) {
  if (row.type === 'free_year') return 365;
  if (row.type === 'free_months') return Math.max(1, row.value) * 30;
  return 0;
}

export function resolvePromoEffects(row: PromoCode, plan: CatalogPlanId = 'medium'): Omit<ResolvedPromo, 'code'> {
  const trialDays = trialDaysFor(row);
  const discountedChargeEuro = discountedChargeEuroForPlan(plan, row);
  return {
    type: row.type,
    value: row.value,
    label: promoLabel(row, plan),
    trialDays,
    discountedChargeEuro,
    paypalStartDelayDays: trialDays,
  };
}

function discountedChargeEuroForPlan(plan: CatalogPlanId, row: PromoCode) {
  return discountedChargeEuro(plan, row);
}

export function validatePromoCode(rawCode: string, plan: PlanId = 'medium'): ResolvedPromo {
  const code = normalizeCode(rawCode);
  if (!code) throw new Error('Inserisci un codice promozionale.');
  const row = loadAll().find((item) => item.code === code);
  if (!row) throw new Error('Codice promozionale non valido.');
  if (!row.active) throw new Error('Questo codice non è più attivo.');
  if (row.expiresAt && row.expiresAt < Date.now()) throw new Error('Questo codice è scaduto.');
  if (row.maxUses != null && row.usedCount >= row.maxUses) throw new Error('Questo codice ha raggiunto il limite di utilizzi.');
  if (row.plans.length && !row.plans.includes(plan)) {
    throw new Error(`Questo codice non vale per il piano ${plan === 'pro' ? 'Pro' : plan === 'medium' ? 'Media' : 'Free'}.`);
  }
  if (plan === 'free') throw new Error('I codici promozionali valgono solo sui piani a pagamento.');
  return { code: row.code, ...resolvePromoEffects(row, plan) };
}

export function incrementPromoUse(rawCode: string) {
  const code = normalizeCode(rawCode);
  if (!code) return;
  const codes = loadAll();
  const index = codes.findIndex((item) => item.code === code);
  if (index < 0) return;
  codes[index] = { ...codes[index], usedCount: (codes[index].usedCount || 0) + 1 };
  saveAll(codes);
}

export async function createPromoCode(input: {
  code: string;
  type: PromoCodeType;
  value: number;
  label?: string;
  active?: boolean;
  expiresAt?: number | null;
  maxUses?: number | null;
  plans?: PlanId[];
}) {
  const code = normalizeCode(input.code);
  if (code.length < 3) throw new Error('Il codice deve avere almeno 3 caratteri.');
  if (loadAll().some((item) => item.code === code)) throw new Error('Esiste già un codice con questo nome.');

  let value = Number(input.value) || 0;
  if (input.type === 'percent') {
    if (value < 1 || value > 100) throw new Error('Lo sconto percentuale deve essere tra 1 e 100.');
  } else if (input.type === 'free_year') {
    value = 12;
  } else if (value < 1 || value > 24) {
    throw new Error('I mesi gratis devono essere tra 1 e 24.');
  }

  const row: PromoCode = {
    id: `promo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    code,
    type: input.type,
    value,
    label: String(input.label || '').trim(),
    active: input.active !== false,
    expiresAt: input.expiresAt ?? null,
    maxUses: input.maxUses ?? null,
    usedCount: 0,
    plans: Array.isArray(input.plans) ? input.plans.filter((p) => p === 'medium' || p === 'pro') : [],
    createdAt: Date.now(),
  };

  const codes = loadAll();
  codes.push(row);
  saveAll(codes);
  return row;
}

export async function updatePromoCode(id: string, patch: Partial<Pick<PromoCode, 'label' | 'active' | 'expiresAt' | 'maxUses'>>) {
  const codes = loadAll();
  const index = codes.findIndex((item) => item.id === id);
  if (index < 0) throw new Error('Codice non trovato.');
  codes[index] = {
    ...codes[index],
    ...patch,
    label: patch.label !== undefined ? String(patch.label).trim() : codes[index].label,
  };
  saveAll(codes);
  return codes[index];
}

export function deletePromoCode(id: string) {
  const codes = loadAll();
  const next = codes.filter((item) => item.id !== id);
  if (next.length === codes.length) throw new Error('Codice non trovato.');
  saveAll(next);
}

export function promoPublicSummary(row: PromoCode) {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: row.value,
    label: promoLabel(row),
    active: row.active,
    expiresAt: row.expiresAt,
    maxUses: row.maxUses,
    usedCount: row.usedCount,
    plans: row.plans,
    createdAt: row.createdAt,
  };
}
