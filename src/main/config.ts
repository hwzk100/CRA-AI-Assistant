import Store from 'electron-store';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { app, safeStorage } from 'electron';
import { DEFAULT_CONFIG } from '../shared/types/config';
import type { AppConfig } from '../shared/types/config';

// Load .env from multiple possible locations
const envPaths = [
  path.join(process.cwd(), '.env'),                    // Running from project root
  path.join(__dirname, '../../.env'),                   // Relative to dist/main/
  path.join(app.getAppPath(), '.env'),                  // App package directory
];

for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`[Config] Loaded .env from: ${envPath}`);
    break;
  }
}

const store = new Store({
  name: 'cra-ai-config',
  encryptionKey: 'cra-ai-assistant-v1',
});

const ENCRYPTED_KEY = 'encrypted_api_keys';

interface EncryptedKeys {
  zhipu?: string;
  openai?: string;
}

function getDecryptedKey(provider: 'zhipu' | 'openai'): string {
  const encrypted = store.get(ENCRYPTED_KEY) as string | undefined;
  if (!encrypted) return '';
  try {
    const keys: EncryptedKeys = JSON.parse(
      safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
    );
    return keys[provider] || '';
  } catch {
    return '';
  }
}

function encryptKey(provider: 'zhipu' | 'openai', apiKey: string): void {
  let keys: EncryptedKeys = {};
  const existing = store.get(ENCRYPTED_KEY) as string | undefined;
  if (existing) {
    try {
      keys = JSON.parse(
        safeStorage.decryptString(Buffer.from(existing, 'base64'))
      );
    } catch {
      keys = {};
    }
  }
  keys[provider] = apiKey;
  const encrypted = safeStorage.encryptString(JSON.stringify(keys));
  store.set(ENCRYPTED_KEY, encrypted.toString('base64'));
}

export function getConfig(): AppConfig {
  // .env takes priority over stored config
  const envApiKey = process.env.ZHIPU_API_KEY || getDecryptedKey('zhipu');
  const envEndpoint = process.env.ZHIPU_API_ENDPOINT;
  const envOpenaiKey = process.env.OPENAI_API_KEY || getDecryptedKey('openai');
  const envOpenaiEndpoint = process.env.OPENAI_API_ENDPOINT;

  const stored = store.get('appConfig') as Partial<AppConfig> | undefined;

  return {
    apiEndpoint: envEndpoint || stored?.apiEndpoint || DEFAULT_CONFIG.apiEndpoint,
    apiKey: envApiKey || stored?.apiKey || DEFAULT_CONFIG.apiKey,
    textModel: process.env.DEFAULT_TEXT_MODEL || stored?.textModel || DEFAULT_CONFIG.textModel,
    visionModel: process.env.DEFAULT_VISION_MODEL || stored?.visionModel || DEFAULT_CONFIG.visionModel,
    openaiApiEndpoint: envOpenaiEndpoint || stored?.openaiApiEndpoint || DEFAULT_CONFIG.openaiApiEndpoint,
    openaiApiKey: envOpenaiKey || stored?.openaiApiKey || DEFAULT_CONFIG.openaiApiKey,
    openaiModel: stored?.openaiModel || DEFAULT_CONFIG.openaiModel,
    provider: stored?.provider || DEFAULT_CONFIG.provider,
  };
}

export function saveConfig(config: Partial<AppConfig>): AppConfig {
  // Encrypt API keys separately
  if (config.apiKey) {
    encryptKey('zhipu', config.apiKey);
  }
  if (config.openaiApiKey) {
    encryptKey('openai', config.openaiApiKey);
  }

  // Store non-sensitive config
  const currentConfig = getConfig();
  const newConfig: AppConfig = { ...currentConfig, ...config };
  store.set('appConfig', {
    apiEndpoint: newConfig.apiEndpoint,
    textModel: newConfig.textModel,
    visionModel: newConfig.visionModel,
    openaiApiEndpoint: newConfig.openaiApiEndpoint,
    openaiModel: newConfig.openaiModel,
    provider: newConfig.provider,
  });

  return getConfig();
}
