import fs from 'fs';
import path from 'path';

export interface BencashServerConfig {
  baseUrl: string;
  privateKey: string;
}

export interface WhatsAppServerConfig {
  enabled: boolean;
  provider: 'cloud_api' | 'custom_gateway' | 'direct_web';
  apiToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  gatewayUrl?: string;
  notifySender: boolean;
  notifyRecipient: boolean;
  notifyInvoices: boolean;
  senderTemplate?: string;
  recipientTemplate?: string;
}

const PRIMARY_BENCASH_FILE = path.join(process.cwd(), 'data', 'bencash_config.json');
const FALLBACK_BENCASH_FILE = '/tmp/bencash_config.json';

const PRIMARY_WHATSAPP_FILE = path.join(process.cwd(), 'data', 'whatsapp_config.json');
const FALLBACK_WHATSAPP_FILE = '/tmp/whatsapp_config.json';

// In-memory runtime caches
let cachedBencash: BencashServerConfig | null = null;
let cachedWhatsApp: WhatsAppServerConfig | null = null;

/**
 * Obtiene la configuración de BenCash asegurando persistencia en servidor
 * Prioridad: Memoria -> Archivo data/ -> Archivo /tmp/ -> Variables de entorno (process.env)
 */
export function getBencashServerConfig(): BencashServerConfig {
  if (cachedBencash && cachedBencash.privateKey) {
    return cachedBencash;
  }

  // Intentar leer de archivo primario o secundario
  for (const filePath of [PRIMARY_BENCASH_FILE, FALLBACK_BENCASH_FILE]) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          cachedBencash = {
            baseUrl: (parsed.baseUrl || process.env.BENCASH_BASE_URL || 'https://reseller.test.bencashgroup.com').trim().replace(/\/+$/, ''),
            privateKey: (parsed.privateKey || process.env.BENCASH_PRIVATE_KEY || '').trim(),
          };
          return cachedBencash;
        }
      }
    } catch (e) {
      console.warn(`[ServerConfig] No se pudo leer configuración BenCash de ${filePath}:`, e);
    }
  }

  // Fallback a variables de entorno
  cachedBencash = {
    baseUrl: (process.env.BENCASH_BASE_URL || 'https://reseller.test.bencashgroup.com').trim().replace(/\/+$/, ''),
    privateKey: (process.env.BENCASH_PRIVATE_KEY || '').trim(),
  };

  return cachedBencash;
}

/**
 * Guarda la configuración de BenCash de manera persistente en disco y memoria
 */
export function saveBencashServerConfig(config: Partial<BencashServerConfig>): BencashServerConfig {
  const current = getBencashServerConfig();
  const updated: BencashServerConfig = {
    baseUrl: (config.baseUrl !== undefined ? config.baseUrl : current.baseUrl).trim().replace(/\/+$/, ''),
    privateKey: config.privateKey !== undefined ? config.privateKey.trim() : current.privateKey,
  };

  cachedBencash = updated;

  const serialized = JSON.stringify(updated, null, 2);

  for (const filePath of [PRIMARY_BENCASH_FILE, FALLBACK_BENCASH_FILE]) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, serialized, 'utf8');
    } catch (e) {
      console.warn(`[ServerConfig] Error escribiendo BenCash config en ${filePath}:`, e);
    }
  }

  return updated;
}

/**
 * Obtiene la configuración de WhatsApp asegurando persistencia en servidor
 */
export function getWhatsAppServerConfig(): WhatsAppServerConfig {
  if (cachedWhatsApp) {
    return cachedWhatsApp;
  }

  for (const filePath of [PRIMARY_WHATSAPP_FILE, FALLBACK_WHATSAPP_FILE]) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          cachedWhatsApp = {
            enabled: parsed.enabled !== undefined ? Boolean(parsed.enabled) : true,
            provider: parsed.provider || 'cloud_api',
            apiToken: (parsed.apiToken || process.env.WHATSAPP_API_TOKEN || '').trim(),
            phoneNumberId: (parsed.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim(),
            businessAccountId: (parsed.businessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '').trim(),
            gatewayUrl: (parsed.gatewayUrl || process.env.WHATSAPP_GATEWAY_URL || '').trim(),
            notifySender: parsed.notifySender !== undefined ? Boolean(parsed.notifySender) : true,
            notifyRecipient: parsed.notifyRecipient !== undefined ? Boolean(parsed.notifyRecipient) : true,
            notifyInvoices: parsed.notifyInvoices !== undefined ? Boolean(parsed.notifyInvoices) : true,
            senderTemplate: parsed.senderTemplate,
            recipientTemplate: parsed.recipientTemplate,
          };
          return cachedWhatsApp;
        }
      }
    } catch (e) {
      console.warn(`[ServerConfig] No se pudo leer WhatsApp config de ${filePath}:`, e);
    }
  }

  cachedWhatsApp = {
    enabled: Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    provider: 'cloud_api',
    apiToken: (process.env.WHATSAPP_API_TOKEN || '').trim(),
    phoneNumberId: (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim(),
    businessAccountId: (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '').trim(),
    gatewayUrl: (process.env.WHATSAPP_GATEWAY_URL || '').trim(),
    notifySender: true,
    notifyRecipient: true,
    notifyInvoices: true,
  };

  return cachedWhatsApp;
}

/**
 * Guarda la configuración de WhatsApp de manera persistente en disco y memoria
 */
export function saveWhatsAppServerConfig(config: Partial<WhatsAppServerConfig>): WhatsAppServerConfig {
  const current = getWhatsAppServerConfig();
  const updated: WhatsAppServerConfig = {
    ...current,
    ...config,
    apiToken: config.apiToken !== undefined ? config.apiToken.trim() : current.apiToken,
    phoneNumberId: config.phoneNumberId !== undefined ? config.phoneNumberId.trim() : current.phoneNumberId,
  };

  cachedWhatsApp = updated;

  const serialized = JSON.stringify(updated, null, 2);

  for (const filePath of [PRIMARY_WHATSAPP_FILE, FALLBACK_WHATSAPP_FILE]) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, serialized, 'utf8');
    } catch (e) {
      console.warn(`[ServerConfig] Error escribiendo WhatsApp config en ${filePath}:`, e);
    }
  }

  return updated;
}
