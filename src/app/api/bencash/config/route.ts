import { NextRequest, NextResponse } from 'next/server';
import { BencashDepositService } from '@/lib/bencash/service';
import { getBencashServerConfig, saveBencashServerConfig } from '@/lib/server-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const serverConfig = getBencashServerConfig();
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
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { baseUrl, privateKey } = body;

    const saved = saveBencashServerConfig({
      baseUrl: typeof baseUrl === 'string' ? baseUrl.trim() : undefined,
      privateKey: typeof privateKey === 'string' ? privateKey.trim() : undefined,
    });

    // Actualiza en el servicio singleton
    BencashDepositService.setRuntimeCredentials(saved.baseUrl, saved.privateKey);

    return NextResponse.json({
      success: true,
      message: 'Configuración de BenCash guardada correctamente y persistida en el servidor',
      baseUrl: saved.baseUrl,
      hasPrivateKey: Boolean(saved.privateKey && saved.privateKey.length > 0),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error guardando configuración' },
      { status: 500 }
    );
  }
}

