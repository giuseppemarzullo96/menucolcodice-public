import type { PlanId } from './tenant';
import { normalizePhone } from './tenant';
import { validatePromoCode, type ResolvedPromo } from './promoCodes';

export function parseSignupPhone(raw: unknown) {
  const phone = normalizePhone(String(raw || ''));
  if (phone.length < 8 || phone.length > 15) {
    throw new Error('Inserisci un numero di telefono valido (con prefisso internazionale).');
  }
  return phone;
}

export function resolveSignupPromo(rawCode: unknown, plan: PlanId, _method: 'stripe' | 'paypal'): ResolvedPromo | null {
  const code = String(rawCode || '').trim();
  if (!code) return null;
  return validatePromoCode(code, plan);
}
