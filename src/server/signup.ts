import fs from 'fs';
import path from 'path';
import type { PlanId, BillingProvider } from './tenant';
import { createTenantAccessCode } from './adminAccessCode';
import { incrementPromoUse } from './promoCodes';
import { enterTenant, getTenantBySlug, normalizePhone, provisionTenant } from './tenant';
import { provisionSubdomainLater, waitUntilTenantHttpsReady } from './provisionHost';
import { sendMail } from './mailer';
import { sendSignupEmails } from './transactionalMail';
import { createSignupOnboardingSession } from './whatsappSetup';
import { beginSetupSession } from './whatsappCommands';
import { COMPANY } from '@/seo/company';

export type PendingSignup = {
  slug: string;
  name: string;
  email: string;
  phone?: string;
  plan: PlanId;
  promoCode?: string;
  paypalSubscriptionId?: string;
  stripeSessionId?: string;
  stripeSubscriptionId?: string;
  createdAt: number;
};

const FILE = path.join(process.cwd(), 'platform', 'signups.json');

function loadAll(): PendingSignup[] {
  if (!fs.existsSync(FILE)) return [];
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  return Array.isArray(raw.signups) ? raw.signups : [];
}

function saveAll(signups: PendingSignup[]) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify({ signups }, null, 2), 'utf8');
}

function matchesPending(row: PendingSignup, needle: string) {
  return (
    row.slug === needle ||
    row.paypalSubscriptionId === needle ||
    row.stripeSessionId === needle ||
    row.stripeSubscriptionId === needle
  );
}

export function savePendingSignup(item: PendingSignup) {
  const list = loadAll().filter((row) => row.slug !== item.slug);
  list.push(item);
  saveAll(list);
}

export function takePendingSignup(slugOrSub: string) {
  const needle = String(slugOrSub || '').toLowerCase();
  const list = loadAll();
  const found = list.find((row) => matchesPending(row, needle) || matchesPending(row, slugOrSub));
  if (!found) return null;
  saveAll(list.filter((row) => row !== found));
  return found;
}

export function listPendingSignups() {
  return loadAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function findPendingSignup(slugOrSub: string) {
  const needle = String(slugOrSub || '').toLowerCase();
  return loadAll().find((row) => matchesPending(row, needle) || matchesPending(row, slugOrSub)) || null;
}

async function notifyOwnerSslFailed(opts: { slug: string; name: string; email?: string; url: string }) {
  const to = String(process.env.MAIL_NOTIFY || COMPANY.email || '').trim();
  if (!to) return;
  const subject = `[Menu col codice] SSL non pronto: ${opts.slug}`;
  const text = [
    `Il locale ${opts.name} (${opts.slug}) è stato creato, ma HTTPS non risponde ancora con un certificato valido.`,
    `URL: ${opts.url}`,
    `Email cliente: ${opts.email || '—'}`,
    'La mail di benvenuto al cliente non è stata inviata.',
  ].join('\n');
  await sendMail({ to, subject, text, html: `<pre>${text}</pre>` });
}

async function sendSignupEmailsWhenHttpsReady(opts: {
  email: string;
  name: string;
  slug: string;
  plan: PlanId;
  url: string;
  accessCode: string;
}) {
  try {
    const ready = await waitUntilTenantHttpsReady(opts.slug, { timeoutMs: 8 * 60 * 1000, intervalMs: 4000 });
    if (!ready) {
      console.error('HTTPS non pronto, mail cliente non inviata', opts.slug);
      await notifyOwnerSslFailed(opts).catch((error) => {
        console.error('Avviso owner SSL', opts.slug, error);
      });
      return;
    }
    await sendSignupEmails(opts);
  } catch (error) {
    console.error('Invio mail dopo HTTPS', opts.slug, error);
  }
}

async function kickoffProSignupOnboarding(opts: { slug: string; name: string; phone: string }) {
  const phone = normalizePhone(opts.phone);
  if (!phone) return;
  const tenant = getTenantBySlug(opts.slug);
  if (!tenant || tenant.plan !== 'pro') return;
  enterTenant(tenant);
  const { session, message } = createSignupOnboardingSession({
    number: phone,
    name: opts.name,
    phone,
  });
  await beginSetupSession(phone, session, message);
}

export async function activateAccount(opts: {
  slug: string;
  name: string;
  plan: PlanId;
  email?: string;
  phone?: string;
  promoCode?: string;
  billingProvider?: BillingProvider;
  paypalSubscriptionId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSessionId?: string;
}) {
  const isNew = !getTenantBySlug(opts.slug);
  const tenant = provisionTenant({
    ...opts,
    promoCodeUsed: opts.promoCode,
  });
  if (opts.promoCode) incrementPromoUse(opts.promoCode);
  const url = `https://${opts.slug}.menucolcodice.it`;
  const accessCode = isNew ? createTenantAccessCode(opts.slug) : undefined;
  if (isNew && accessCode) {
    provisionSubdomainLater(opts.slug);
    void sendSignupEmailsWhenHttpsReady({
      email: opts.email || '',
      name: opts.name,
      slug: opts.slug,
      plan: tenant.plan,
      url,
      accessCode,
    });
    if (tenant.plan === 'pro' && opts.phone) {
      void kickoffProSignupOnboarding({
        slug: opts.slug,
        name: opts.name,
        phone: opts.phone,
      }).catch((error) => {
        console.error('Onboarding WhatsApp Pro non avviato', opts.slug, error);
      });
    }
  }
  return { tenant, url, accessCode };
}
