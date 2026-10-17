import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_FIREBASE_BACKEND = 'https://studio-4779362907-870c5.web.app';
const PROXY_HEADER = 'x-hispaniolapay-backend-proxy';

function hasFirebaseAdminCredentials() {
  const projectId = String(process.env.FIREBASE_ADMIN_PROJECT_ID || '').trim();
  const clientEmail = String(process.env.FIREBASE_ADMIN_CLIENT_EMAIL || '').trim();
  const privateKey = String(process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').trim();
  const isPlaceholder = (value: string) =>
    !value || /REEMPLAZAR|CHANGE_ME|YOUR_|PENDIENTE/i.test(value);

  if (isPlaceholder(projectId) || isPlaceholder(clientEmail) || isPlaceholder(privateKey)) {
    return false;
  }
  if (!clientEmail.includes('@') || !clientEmail.includes('.iam.gserviceaccount.com')) {
    return false;
  }
  if (privateKey.includes('BEGIN PRIVATE KEY')) return true;

  try {
    return Buffer.from(privateKey, 'base64').toString('utf8').includes('BEGIN PRIVATE KEY');
  } catch {
    return false;
  }
}

function isGoogleRuntime() {
  return Boolean(
    process.env.K_SERVICE ||
      process.env.FUNCTION_TARGET ||
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.FIREBASE_CONFIG,
  );
}

/**
 * Hostinger does not provide Google Application Default Credentials. When an
 * explicit Firebase service account has not been configured there, delegate
 * sensitive administrative operations to the Firebase backend, where the
 * workload identity is already available. The original Firebase ID token is
 * forwarded and validated again by that backend.
 */
export async function proxyRequestToFirebaseBackend(
  req: NextRequest,
): Promise<NextResponse | null> {
  if (isGoogleRuntime() || hasFirebaseAdminCredentials()) return null;
  if (req.headers.get(PROXY_HEADER) === '1') return null;

  const origin = (process.env.FIREBASE_BACKEND_ORIGIN || DEFAULT_FIREBASE_BACKEND)
    .trim()
    .replace(/\/+$/, '');
  const target = `${origin}${req.nextUrl.pathname}${req.nextUrl.search}`;

  const headers = new Headers({
    Accept: 'application/json',
    [PROXY_HEADER]: '1',
  });
  const authorization = req.headers.get('authorization');
  const contentType = req.headers.get('content-type');
  if (authorization) headers.set('Authorization', authorization);
  if (contentType) headers.set('Content-Type', contentType);

  try {
    const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text();
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(30000),
    });
    const payload = await upstream.arrayBuffer();
    return new NextResponse(payload, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `No se pudo conectar con el backend seguro de Firebase: ${
          error instanceof Error ? error.message : 'error de red'
        }`,
      },
      { status: 502 },
    );
  }
}

// Backwards-compatible name used by the configuration endpoints.
export const proxyAdministrativeRequestToFirebase = proxyRequestToFirebaseBackend;
