import { COMPANY, COMPANY_WHATSAPP_URL } from '@/seo/company';
import { PLAN_CATALOG, formatEuro, type CatalogPlanId } from '@/utils/plans';
import { sendMail } from './mailer';
import type { PlanId } from './tenant';

export type AccountReadyMail = {
  email: string;
  name: string;
  slug: string;
  plan: PlanId;
  url: string;
  accessCode: string;
};

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function planLabel(plan: PlanId) {
  const row = PLAN_CATALOG.find((item) => item.id === plan);
  if (!row) return plan;
  if (!row.listEuro) return row.name;
  return `${row.name} (${formatEuro(row.listEuro)} €/mese + IVA)`;
}

function paidCopy(plan: PlanId) {
  if (plan === 'free') return '';
  const row = PLAN_CATALOG.find((item) => item.id === (plan as CatalogPlanId));
  if (!row?.listEuro) return 'Il pagamento è andato a buon fine.';
  return `Il pagamento è andato a buon fine. Piano ${row.name}: ${formatEuro(row.listEuro)} € al mese più IVA.`;
}

export async function sendAccountReadyEmail(opts: AccountReadyMail) {
  const to = String(opts.email || '').trim();
  if (!isEmail(to)) return false;

  const name = String(opts.name || opts.slug).trim();
  const url = opts.url.replace(/\/$/, '');
  const admin = `${url}/admin/login`;
  const paid = paidCopy(opts.plan);
  const subject = paid
    ? `Pagamento ricevuto: il menu di ${name} è online`
    : `Il menu di ${name} è online`;

  const text = [
    `Ciao.`,
    ``,
    `Il menu digitale di ${name} è online.`,
    paid,
    ``,
    `Indirizzo del menu: ${url}`,
    `Pannello: ${admin}`,
    `Piano: ${planLabel(opts.plan)}`,
    ``,
    `Codice di accesso al pannello: ${opts.accessCode}`,
    `Conservalo: serve per entrare in ${admin}. Puoi cambiarlo in qualsiasi momento dal tab Sicurezza.`,
    ``,
    `Domande: ${COMPANY.email}`,
    `WhatsApp: ${COMPANY.whatsappDisplay}`,
    COMPANY_WHATSAPP_URL,
    ``,
    COMPANY.productName,
    COMPANY.legalName,
    COMPANY.seat,
  ]
    .filter((line) => line !== '')
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="it">
<body style="margin:0;padding:0;background:#FAF7F0;font-family:Manrope,Arial,sans-serif;color:#1A1A17;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FAF7F0;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #E8E2D6;">
          <tr>
            <td style="background:#1A1A17;color:#FAF7F0;padding:20px 24px;font-size:15px;letter-spacing:0.02em;">
              ${escapeHtml(COMPANY.productName)}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;font-size:22px;line-height:1.3;font-weight:700;">
              Il menu di ${escapeHtml(name)} è online.
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 20px;font-size:15px;line-height:1.6;">
              ${paid ? `<p style="margin:0 0 16px;">${escapeHtml(paid)}</p>` : ''}
              <p style="margin:0 0 8px;"><strong>Indirizzo del menu</strong><br><a href="${escapeHtml(url)}" style="color:#1A1A17;">${escapeHtml(url)}</a></p>
              <p style="margin:0 0 8px;"><strong>Pannello</strong><br><a href="${escapeHtml(admin)}" style="color:#1A1A17;">${escapeHtml(admin)}</a></p>
              <p style="margin:0 0 8px;"><strong>Piano</strong><br>${escapeHtml(planLabel(opts.plan))}</p>
              <p style="margin:0 0 8px;"><strong>Codice di accesso al pannello</strong><br><span style="font-size:20px;font-weight:700;letter-spacing:0.08em;">${escapeHtml(opts.accessCode)}</span></p>
              <p style="margin:0 0 20px;">Conservalo: serve per entrare nel pannello. Puoi cambiarlo in qualsiasi momento dal tab Sicurezza.</p>
              <p style="margin:0;">
                <a href="${escapeHtml(admin)}" style="display:inline-block;background:#E0A32E;color:#1A1A17;text-decoration:none;padding:12px 18px;font-weight:700;">Apri il pannello</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 28px;font-size:13px;line-height:1.6;color:#5C5850;">
              Domande: <a href="mailto:${COMPANY.email}" style="color:#1A1A17;">${COMPANY.email}</a><br>
              WhatsApp: <a href="${COMPANY_WHATSAPP_URL}" style="color:#1A1A17;">${COMPANY.whatsappDisplay}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #E8E2D6;font-size:12px;line-height:1.5;color:#5C5850;">
              ${escapeHtml(COMPANY.legalName)} · ${escapeHtml(COMPANY.seat)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendMail({ to, subject, text, html });
}

export async function sendOwnerSignupNotice(opts: AccountReadyMail) {
  const to = String(process.env.MAIL_NOTIFY || COMPANY.email).trim();
  if (!isEmail(to)) return false;
  const name = String(opts.name || opts.slug).trim();
  const url = opts.url.replace(/\/$/, '');
  const admin = `${url}/admin/login`;
  const customer = String(opts.email || '').trim() || '—';
  const subject = `Nuova iscrizione: ${name} (${planLabel(opts.plan)})`;
  const text = [
    `Si è iscritto un locale.`,
    ``,
    `Nome: ${name}`,
    `Indirizzo: ${url}`,
    `Pannello: ${admin}`,
    `Piano: ${planLabel(opts.plan)}`,
    `Email cliente: ${customer}`,
    `Codice accesso pannello: ${opts.accessCode}`,
  ].join('\n');
  const html = `<!DOCTYPE html>
<html lang="it">
<body style="margin:0;padding:24px;background:#FAF7F0;font-family:Manrope,Arial,sans-serif;color:#1A1A17;">
  <p>Si è iscritto un locale.</p>
  <p>
    <strong>Nome:</strong> ${escapeHtml(name)}<br>
    <strong>Indirizzo:</strong> <a href="${escapeHtml(url)}">${escapeHtml(url)}</a><br>
    <strong>Pannello:</strong> <a href="${escapeHtml(admin)}">${escapeHtml(admin)}</a><br>
    <strong>Piano:</strong> ${escapeHtml(planLabel(opts.plan))}<br>
    <strong>Email cliente:</strong> ${escapeHtml(customer)}<br>
    <strong>Codice accesso:</strong> ${escapeHtml(opts.accessCode)}
  </p>
</body>
</html>`;
  return sendMail({ to, subject, text, html });
}

export async function sendSignupEmails(opts: AccountReadyMail) {
  await sendAccountReadyEmail(opts);
  await sendOwnerSignupNotice(opts);
}

export type AccessCodeRecoveryMail = {
  email: string;
  name: string;
  url: string;
  accessCode: string;
};

export async function sendAccessCodeRecoveryEmail(opts: AccessCodeRecoveryMail) {
  const to = String(opts.email || '').trim();
  if (!isEmail(to)) return false;

  const name = String(opts.name || '').trim();
  const url = opts.url.replace(/\/$/, '');
  const admin = `${url}/admin/login`;
  const subject = 'Nuovo codice di accesso al pannello';

  const text = [
    `Ciao.`,
    ``,
    `Hai chiesto di recuperare il codice di accesso al pannello di ${name || 'questo locale'}.`,
    `Il vecchio codice non è più valido: ne abbiamo generato uno nuovo.`,
    ``,
    `Nuovo codice di accesso: ${opts.accessCode}`,
    `Pannello: ${admin}`,
    ``,
    `Se non sei stato tu a richiederlo, scrivici subito: ${COMPANY.email}`,
    ``,
    COMPANY.productName,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="it">
<body style="margin:0;padding:0;background:#FAF7F0;font-family:Manrope,Arial,sans-serif;color:#1A1A17;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FAF7F0;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #E8E2D6;">
          <tr>
            <td style="background:#1A1A17;color:#FAF7F0;padding:20px 24px;font-size:15px;letter-spacing:0.02em;">
              ${escapeHtml(COMPANY.productName)}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;font-size:22px;line-height:1.3;font-weight:700;">
              Nuovo codice di accesso
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 20px;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 16px;">Hai chiesto di recuperare il codice di accesso al pannello di <strong>${escapeHtml(name || 'questo locale')}</strong>. Il vecchio codice non è più valido: ne abbiamo generato uno nuovo.</p>
              <p style="margin:0 0 8px;"><strong>Nuovo codice di accesso</strong><br><span style="font-size:20px;font-weight:700;letter-spacing:0.08em;">${escapeHtml(opts.accessCode)}</span></p>
              <p style="margin:0 0 20px;">
                <a href="${escapeHtml(admin)}" style="display:inline-block;background:#E0A32E;color:#1A1A17;text-decoration:none;padding:12px 18px;font-weight:700;">Apri il pannello</a>
              </p>
              <p style="margin:0;font-size:13px;color:#5C5850;">Se non sei stato tu a richiederlo, scrivici subito: <a href="mailto:${COMPANY.email}" style="color:#1A1A17;">${COMPANY.email}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #E8E2D6;font-size:12px;line-height:1.5;color:#5C5850;">
              ${escapeHtml(COMPANY.legalName)} · ${escapeHtml(COMPANY.seat)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendMail({ to, subject, text, html });
}
