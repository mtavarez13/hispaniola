import 'server-only';

import { adminDb } from '@/lib/firebase-admin';

export const RECARGAS_PRODUCTION_URL = 'https://api.recargasdominicanas.do';
export const RECARGAS_DEVELOPMENT_URL = 'https://dev.api.recargasdominicanas.do';

export type RecargasConfig = {
  enabled: boolean;
  baseUrl: string;
  username: string;
  password: string;
  feePercent: number;
};

export class RecargasProviderError extends Error {
  constructor(
    message: string,
    public status = 502,
    public code = 'PROVIDER_ERROR',
    public definiteFailure = false,
  ) {
    super(message);
  }
}

const cleanBaseUrl = (value: unknown) => {
  const url = String(value || RECARGAS_PRODUCTION_URL).trim().replace(/\/+$/, '');
  // Produccion publica las rutas en la raiz. La documentacion contiene ejemplos
  // antiguos con /api, que actualmente responden 404.
  return url.endsWith('/api') ? url.slice(0, -4) : url;
};

const validateOfficialBaseUrl = (value: unknown) => {
  const clean = cleanBaseUrl(value);
  let parsed: URL;
  try {
    parsed = new URL(clean);
  } catch {
    throw new RecargasProviderError('La URL del proveedor no es válida.', 400, 'INVALID_PROVIDER_URL', true);
  }
  const allowedHosts = new Set(['api.recargasdominicanas.do', 'dev.api.recargasdominicanas.do']);
  if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname) || (parsed.pathname !== '/' && parsed.pathname !== '')) {
    throw new RecargasProviderError('Utiliza únicamente el servidor oficial de pruebas o producción de Recargas Dominicanas.', 400, 'INVALID_PROVIDER_URL', true);
  }
  return `${parsed.protocol}//${parsed.hostname}`;
};

export async function getRecargasConfig(): Promise<RecargasConfig> {
  const snapshot = await adminDb.collection('private_config').doc('recargas_dominicanas').get();
  const data = snapshot.data() || {};
  return {
    enabled: data.enabled === true,
    baseUrl: validateOfficialBaseUrl(data.baseUrl || process.env.RECARGAS_DOMINICANAS_BASE_URL || RECARGAS_DEVELOPMENT_URL),
    username: String(data.username || process.env.RECARGAS_DOMINICANAS_USERNAME || '').trim(),
    password: String(data.password || process.env.RECARGAS_DOMINICANAS_PASSWORD || ''),
    feePercent: Math.max(0, Math.min(100, Number(data.feePercent || 0))),
  };
}

export async function saveRecargasConfig(input: Partial<RecargasConfig>) {
  const current = await getRecargasConfig();
  const config: RecargasConfig = {
    enabled: input.enabled ?? current.enabled,
    baseUrl: validateOfficialBaseUrl(input.baseUrl || current.baseUrl),
    username: String(input.username ?? current.username).trim(),
    password: input.password ? String(input.password) : current.password,
    feePercent: Math.max(0, Math.min(100, Number(input.feePercent ?? current.feePercent))),
  };
  await adminDb.collection('private_config').doc('recargas_dominicanas').set({
    ...config,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  return config;
}

function providerMessage(payload: any, fallback: string) {
  const raw = String(payload?.message || payload?.error || payload?.code || fallback);
  const messages: Record<string, string> = {
    INSUFFICIENT_FUNDS: 'El proveedor no tiene fondos suficientes.',
    INVALID_PHONE: 'El número indicado no es válido.',
    INVALID_NUMBER: 'El número de contrato o servicio no es válido.',
    DUPLICATED: 'El proveedor detectó una transacción duplicada.',
    WRONG_COMPANY: 'El número no corresponde a la compañía seleccionada.',
    NOT_FOUND_EXCEPTION: 'No se encontró el contrato o servicio solicitado.',
    NO_OUTSTANDING_INVOICES: 'No existen facturas pendientes para este contrato.',
    REQUEST_TIMEOUT: 'El proveedor agotó el tiempo de espera.',
    WRONG_USER_OR_PASSWORD: 'Usuario o contraseña incorrectos.',
    OUTSTANDING_BALANCE: 'El número tiene un balance pendiente y no admite este paquetico.',
    TRANSACTION_ALREADY_CANCELLED: 'La operación ya fue cancelada.',
    CANCELLATION_TIME_EXPIRED: 'El tiempo permitido para cancelar esta operación ya venció.',
    CANCELLATION_NOT_ALLOWED: 'El proveedor no permite cancelar esta operación.',
    INTERNAL_SERVER_ERROR: 'El proveedor presentó un error interno. Intenta nuevamente más tarde.',
    UNKNOWN_ERROR: 'El proveedor no pudo completar la operación.',
  };
  return messages[raw] || raw;
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { message: text.slice(0, 500) }; }
}

async function fetchWithRetry(url: string, init: RequestInit, attempts: number, timeoutMs: number) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (response.status < 500 || attempt === attempts - 1) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
  }
  throw lastError instanceof Error ? lastError : new Error('No hubo respuesta del proveedor');
}

async function login(config: RecargasConfig) {
  if (!config.enabled) throw new RecargasProviderError('El servicio de recargas aún no está habilitado.', 503, 'SERVICE_DISABLED', true);
  if (!config.username || !config.password) throw new RecargasProviderError('Faltan las credenciales comerciales del proveedor.', 503, 'MISSING_CREDENTIALS', true);
  let response: Response;
  try {
    response = await fetchWithRetry(`${config.baseUrl}/business-user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ userName: config.username, password: config.password }),
      cache: 'no-store',
    }, 3, 15000);
  } catch (error) {
    throw new RecargasProviderError(`No se pudo iniciar sesión con el proveedor: ${error instanceof Error ? error.message : 'error de red'}`, 502, 'LOGIN_NETWORK_ERROR');
  }
  const payload = await parseResponse(response);
  if (!response.ok) throw new RecargasProviderError(providerMessage(payload, 'No se pudo autenticar con el proveedor.'), response.status, 'LOGIN_FAILED', true);
  const headersWithCookies = response.headers as Headers & { getSetCookie?: () => string[] };
  const cookieHeaders = headersWithCookies.getSetCookie?.() || [response.headers.get('set-cookie') || ''];
  const cookieMatch = cookieHeaders
    .flatMap((value) => value.split(/,(?=\s*[^;,=]+=[^;,]+)/g))
    // Produccion usa `recargasdominicanas`; pruebas usa
    // `dev-recargasdominicanas`. Debemos reenviar exactamente la recibida.
    .map((value) => value.match(/(?:^|;\s*)((?:dev-)?recargasdominicanas=[^;]+)/i)?.[1])
    .find(Boolean);
  const cookie = cookieMatch || '';
  if (!cookie) {
    throw new RecargasProviderError('El proveedor no devolvió una sesión válida.', 502, 'SESSION_COOKIE_MISSING');
  }
  return cookie;
}

async function requestWithSession<T>(config: RecargasConfig, cookie: string, path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    const method = String(init.method || 'GET').toUpperCase();
    response = await fetchWithRetry(`${config.baseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {}),
        Cookie: cookie,
      },
      cache: 'no-store',
    }, method === 'GET' ? 3 : 1, 25000);
  } catch (error) {
    throw new RecargasProviderError(`No hubo respuesta del proveedor: ${error instanceof Error ? error.message : 'error de red'}`, 502, 'PROVIDER_NETWORK_ERROR');
  }
  const payload = await parseResponse(response);
  if (!response.ok) {
    const definiteFailure = response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429;
    throw new RecargasProviderError(providerMessage(payload, `El proveedor respondió HTTP ${response.status}.`), response.status, String(payload?.code || payload?.error || 'PROVIDER_REJECTED'), definiteFailure);
  }
  return payload as T;
}

export async function recargasRequest<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const config = await getRecargasConfig();
  const cookie = await login(config);
  return requestWithSession<T>(config, cookie, path, init);
}

export async function verifyRecargasConnection() {
  const config = await getRecargasConfig();
  const cookie = await login(config);
  const [profile, business, products] = await Promise.all([
    requestWithSession(config, cookie, '/business-user'),
    requestWithSession(config, cookie, '/business-user/business'),
    requestWithSession<any[]>(config, cookie, '/business/products'),
  ]);
  // Keep disabled products in the administrative catalog so their real
  // provider status remains visible. Transaction routes still reject them.
  return { profile, business, products: Array.isArray(products) ? products : [] };
}

