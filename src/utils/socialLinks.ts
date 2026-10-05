function pathParts(url: string): string[] {
  try {
    return new URL(url).pathname.split('/').filter(Boolean);
  } catch {
    return [];
  }
}

export function usableProfileUrl(url?: string, kind?: 'facebook' | 'instagram'): string {
  const u = String(url || '').trim();
  if (!/^https?:\/\//i.test(u)) return '';
  let host = '';
  try {
    host = new URL(u).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
  if (kind === 'facebook') {
    if (!/facebook\.com|fb\.com|fb\.me/.test(host)) return '';
    if (/sharer|share\.php|dialog\/(share|feed)|plugins\//i.test(u)) return '';
    if (pathParts(u).length < 1) return '';
    return u.split('?')[0];
  }
  if (kind === 'instagram') {
    if (!/instagram\.com/.test(host)) return '';
    if (pathParts(u).length < 1) return '';
    return u.split('?')[0];
  }
  return u.split('?')[0];
}

export function usableDeliveryUrl(url?: string, kind?: 'glovo' | 'deliveroo' | 'justeat'): string {
  const u = String(url || '').trim();
  if (!/^https?:\/\//i.test(u)) return '';
  let host = '';
  let pathname = '';
  try {
    const parsed = new URL(u);
    host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    pathname = parsed.pathname;
  } catch {
    return '';
  }
  const parts = pathParts(u);
  const clean = u.split('#')[0].split('?')[0];
  if (!parts.length) return '';

  if (kind === 'glovo') {
    if (!/glovo/.test(host)) return '';
    // Homepage: glovoapp.com/it o glovoapp.com/it/it
    if (parts.length <= 2 && parts.every((p) => /^(it|en|es|fr|de|pt)$/i.test(p))) return '';
    return clean;
  }
  if (kind === 'deliveroo') {
    if (!/deliveroo/.test(host)) return '';
    if (parts.length === 1 && /^(it|en|es|fr)$/i.test(parts[0])) return '';
    if (/\/(menu|restaurants)\//i.test(pathname) || parts.length >= 3) return clean;
    return '';
  }
  if (kind === 'justeat') {
    if (!/justeat|just-eat/.test(host)) return '';
    // "justeat.it/ristorante/slug" e "justeat.it/locale/città/slug" sono vecchi schemi
    // URL dismessi: le pagine sono morte ("Ops! Non abbiamo trovato la pagina").
    // Lo schema attuale è "justeat.it/restaurants-slug".
    if (/^(ristorante|locale)$/i.test(parts[0])) return '';
    if (parts.length === 1 && /^restaurants[-_]/i.test(parts[0])) return clean;
    if (/\/(restaurants?|menu|takeaway)\//i.test(pathname)) return clean;
    if (parts.length >= 2) return clean;
    return '';
  }
  return '';
}

export function usableWhatsApp(value?: string): string {
  const v = String(value || '').trim();
  if (!v) return '';
  if (/^https?:\/\/(www\.)?(whatsapp\.com|wa\.me)\/?$/i.test(v)) return '';
  const digits = v.replace(/\D/g, '');
  if (digits.length < 9) return '';
  return v;
}

export function sanitizeSocial(social: Record<string, any> = {}) {
  return {
    facebook: usableProfileUrl(social.facebook, 'facebook'),
    instagram: usableProfileUrl(social.instagram, 'instagram'),
    whatsapp: usableWhatsApp(social.whatsapp),
    glovo: usableDeliveryUrl(social.glovo, 'glovo'),
    deliveroo: usableDeliveryUrl(social.deliveroo, 'deliveroo'),
    justeat: usableDeliveryUrl(social.justeat, 'justeat'),
  };
}
