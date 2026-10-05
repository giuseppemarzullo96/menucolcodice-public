import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type IntegrationsConfig = {
  webhookToken: string;
  openai: {
    apiKey: string;
    model: string;
  };
  deepseek: {
    apiKey: string;
    model: string;
  };
  evolution: {
    baseUrl: string;
    apiKey: string;
    instance: string;
    allowedNumbers: string[];
  };
  google: {
    ga4MeasurementId: string;
    searchConsoleVerification: string;
    places: {
      apiKey: string;
    };
  };
  tripo3d: {
    apiKey: string;
  };
};

const CONFIG_PATH = path.join(process.cwd(), 'platform', 'integrations.json');
const LEGACY_CONFIG_PATH = path.join(process.cwd(), 'database', 'integrations.json');

const DEFAULTS: IntegrationsConfig = {
  webhookToken: '',
  openai: {
    apiKey: '',
    model: 'gpt-4o-mini',
  },
  deepseek: {
    apiKey: '',
    model: 'deepseek-v4-flash',
  },
  evolution: {
    baseUrl: 'http://127.0.0.1:8080',
    apiKey: '',
    instance: 'menucolcodice',
    allowedNumbers: [],
  },
  google: {
    ga4MeasurementId: '',
    searchConsoleVerification: '',
    places: {
      apiKey: '',
    },
  },
  tripo3d: {
    apiKey: '',
  },
};

function configPath() {
  if (fs.existsSync(CONFIG_PATH)) return CONFIG_PATH;
  if (fs.existsSync(LEGACY_CONFIG_PATH)) return LEGACY_CONFIG_PATH;
  return CONFIG_PATH;
}

export function loadIntegrations(): IntegrationsConfig {
  const file = configPath();
  if (!fs.existsSync(file)) {
    const created = {
      ...DEFAULTS,
      webhookToken: crypto.randomBytes(24).toString('hex'),
    };
    saveIntegrations(created);
    return created;
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  return {
    webhookToken: raw.webhookToken || DEFAULTS.webhookToken,
    openai: { ...DEFAULTS.openai, ...(raw.openai || {}) },
    deepseek: { ...DEFAULTS.deepseek, ...(raw.deepseek || {}) },
    evolution: {
      ...DEFAULTS.evolution,
      ...(raw.evolution || {}),
      allowedNumbers: Array.isArray(raw.evolution?.allowedNumbers)
        ? raw.evolution.allowedNumbers
        : [],
    },
    google: {
      ...DEFAULTS.google,
      ...(raw.google || {}),
      places: { ...DEFAULTS.google.places, ...(raw.google?.places || {}) },
    },
    tripo3d: { ...DEFAULTS.tripo3d, ...(raw.tripo3d || {}) },
  };
}

export function publicGoogleConfig() {
  const google = loadIntegrations().google;
  return {
    ga4MeasurementId: String(google.ga4MeasurementId || '').trim(),
    searchConsoleVerification: String(google.searchConsoleVerification || '').trim(),
  };
}

export function saveIntegrations(config: IntegrationsConfig) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

export function maskKey(value: string): string {
  if (!value) return '';
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
