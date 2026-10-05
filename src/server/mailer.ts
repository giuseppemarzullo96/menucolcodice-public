import nodemailer from 'nodemailer';

export type OutgoingMail = {
  to: string;
  bcc?: string;
  subject: string;
  text: string;
  html: string;
};

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function env(name: string, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

export function mailFromAddress() {
  return env('MAIL_FROM', env('SMTP_USER', 'info@menucolcodice.it'));
}

export function mailConfigured() {
  return Boolean(env('SMTP_USER') && env('SMTP_PASS'));
}

function getTransporter() {
  if (transporter) return transporter;
  const user = env('SMTP_USER');
  const pass = env('SMTP_PASS');
  if (!user || !pass) {
    throw new Error('SMTP non configurato');
  }
  transporter = nodemailer.createTransport({
    host: env('SMTP_HOST', 'smtp.ionos.it'),
    port: Number(env('SMTP_PORT', '587')) || 587,
    secure: env('SMTP_PORT') === '465',
    requireTLS: env('SMTP_PORT') !== '465',
    auth: { user, pass },
    tls: { minVersion: 'TLSv1.2' },
  });
  return transporter;
}

export async function sendMail(mail: OutgoingMail) {
  if (!mailConfigured()) {
    console.warn('Mail transazionale non inviata: manca SMTP_USER o SMTP_PASS');
    return false;
  }
  const fromAddress = mailFromAddress();
  const fromName = env('MAIL_FROM_NAME', 'Menu col codice');
  const replyTo = env('MAIL_REPLY_TO', fromAddress);
  await getTransporter().sendMail({
    from: `${fromName} <${fromAddress}>`,
    to: mail.to,
    bcc: mail.bcc || undefined,
    replyTo,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
  return true;
}
