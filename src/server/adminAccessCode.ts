import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { tenantDataDir } from './tenant';

const ENCRYPTION_KEY = process.env.ADMIN_ENCRYPTION_KEY || 'menucolcodice-admin-key-2024-default-change-me';
const ALGORITHM = 'aes-256-cbc';

function keyBuffer() {
  return Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
}

export function encryptAccessCode(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decryptAccessCode(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 2) throw new Error('Formato crittografato non valido');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer(), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function generateAccessCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += chars[bytes[i] % chars.length];
  return out;
}

export function adminConfigPath(slug?: string) {
  return path.join(tenantDataDir(slug), 'admin-config.json');
}

export function readAdminConfig(slug?: string) {
  const configPath = adminConfigPath(slug);
  if (!fs.existsSync(configPath)) return null;
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

export function saveTenantAccessCode(code: string, slug?: string) {
  const configPath = adminConfigPath(slug);
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  const config = readAdminConfig(slug) || {};
  config.encryptedAccessCode = encryptAccessCode(code.trim());
  config.updatedAt = new Date().toISOString();
  if (!config.createdAt) config.createdAt = config.updatedAt;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

/** Genera un codice casuale e lo salva per il locale. */
export function createTenantAccessCode(slug?: string): string {
  const code = generateAccessCode();
  saveTenantAccessCode(code, slug);
  return code;
}

/**
 * Rigenera il codice di accesso e invalida la sessione admin corrente (chi era già
 * loggato dovrà rientrare col nuovo codice). Usata sia dal comando WhatsApp "nuovo
 * codice accesso" sia dal recupero via email dalla pagina di login.
 */
export function regenerateTenantAccessCode(slug?: string): string {
  const code = createTenantAccessCode(slug);
  const configPath = adminConfigPath(slug);
  const config = readAdminConfig(slug) || {};
  config.sessionToken = '';
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  return code;
}

export function tenantHasAccessCode(slug?: string) {
  const config = readAdminConfig(slug);
  return Boolean(config?.encryptedAccessCode);
}

export function verifyTenantAccessCode(input: string, slug?: string) {
  const config = readAdminConfig(slug);
  if (!config?.encryptedAccessCode) return false;
  return decryptAccessCode(config.encryptedAccessCode) === input.trim();
}
