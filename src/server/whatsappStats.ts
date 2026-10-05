import { summarizeTenant } from './analyticsStore';
import { currentTenant } from './tenant';
import { currentRestaurant } from './restaurantStore';

function formatDuration(sec: number) {
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s} secondi`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} minuto${m === 1 ? '' : 'i'} e ${r}` : `${m} minuto${m === 1 ? '' : 'i'}`;
}

export function statsText(days = 7) {
  const summary = summarizeTenant(currentTenant().slug, days);
  const top = summary.topDishes[0];
  const sessions = summary.totals.sessions || 0;
  const qr = summary.totals.qrScans || 0;
  const dwell = summary.totals.avgDwellSec || 0;
  const lines = [
    `Ultimi ${days} giorni:`,
    `· ${sessions} person${sessions === 1 ? 'a ha' : 'e hanno'} aperto il menu`,
    `· ${qr} dal QR sul tavolo`,
    `· restano in media ${formatDuration(dwell)}`,
  ];
  if (top) {
    lines.push(`· piatto più guardato: *${top.name}* (${top.count} volt${top.count === 1 ? 'a' : 'e'})`);
  } else {
    lines.push(`· ancora pochi dati sui piatti aperti`);
  }
  return lines.join('\n');
}

export function menuLinkText() {
  const slug = currentTenant().slug;
  const name = currentRestaurant().restaurantInfo?.name || currentTenant().name || slug;
  const url = `https://${slug}.menucolcodice.it`;
  return `Ecco il menu di *${name}* da mandare ai clienti:\n${url}`;
}

export function menuOrigin() {
  return `https://${currentTenant().slug}.menucolcodice.it`;
}
