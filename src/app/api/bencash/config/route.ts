import { NextRequest, NextResponse } from 'next/server';
import { BencashDepositService } from '@/lib/bencash/service';
import {
  getPersistentBencashServerConfig,
  savePersistentBencashServerConfig,
} from '@/lib/server-config';
import { adminAuthError, requireAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
  await requireAdmin(req, { requireSettings: true });
  const serverConfig = await getPersistentBencashServerConfig();
  const runtime = BencashDepositService.getRuntimeCredentials();
  const currentBaseUrl = runtime.baseUrl || serverConfig.baseUrl || 'https://reseller.test.bencashgroup.com';
  const currentKey = (runtime.privateKey !== null ? runtime.privateKey : serverConfig.privateKey) || '';

  return NextResponse.json({
    success: true,
    baseUrl: currentBaseUrl,
    hasPrivateKey: Boolean(currentKey && currentKey.trim().length > 0),
    maskedKey: currentKey ? `${currentKey.slice(0, 4)}••••••••${currentKey.slice(-4)}` : '',
    privateKey: currentKey, // Permite recargar en el formulario si el usuario refresca
  });
  } catch (error) {
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req, { requireSettings: true });
    const body = await req.json();
    const { baseUrl, privateKey } = body;

    const saved = await savePersistentBencashServerConfig({
      baseUrl: typeof baseUrl === 'string' ? baseUrl.trim() : undefined,
      privateKey: typeof privateKey === 'string' ? privateKey.trim() : undefined,
    });

    // Actualiza en el servicio singleton
    BencashDepositService.setRuntimeCredentials(saved.baseUrl, saved.privateKey);

    return NextResponse.json({
      success: true,
      message: 'Configuración de BenCash guardada permanentemente en Firestore',
      baseUrl: saved.baseUrl,
      hasPrivateKey: Boolean(saved.privateKey && saved.privateKey.length > 0),
    });
  } catch (err: any) {
    const authError = adminAuthError(err);
    if (authError.status === 401 || String(err?.message || '').includes('FORBIDDEN')) {
      return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
    }
    return NextResponse.json(
      { success: false, error: err.message || 'Error guardando configuración' },
      { status: 500 }
    );
  }
}

