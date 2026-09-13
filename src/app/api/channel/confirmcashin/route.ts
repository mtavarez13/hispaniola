import { NextRequest, NextResponse } from 'next/server';
import { executeConfirmCashIn, BencashDepositService } from '@/lib/bencash/service';
import { getBencashServerConfig, saveBencashServerConfig } from '@/lib/server-config';

export const dynamic = 'force-dynamic';

/**
 * Proxy alias for /api/channel/confirmcashin
 * Allows client or external integrations calling /api/channel/confirmcashin
 * to confirm transactions seamlessly within the 60-second window.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { txId, verifyCode, isConfirm, requestId, baseUrl, privateKey, operator } = body;

    const headerKey = req.headers.get('x-bencash-key') || req.headers.get('skml') || '';
    const headerBaseUrl = req.headers.get('x-bencash-base-url') || '';
    const serverConfig = getBencashServerConfig();

    const effectivePrivateKey = (privateKey || headerKey || serverConfig.privateKey || process.env.BENCASH_PRIVATE_KEY || '').trim();
    const effectiveBaseUrl = (baseUrl || headerBaseUrl || serverConfig.baseUrl || process.env.BENCASH_BASE_URL || 'https://reseller.test.bencashgroup.com').trim();

    if (effectivePrivateKey) {
      saveBencashServerConfig({ privateKey: effectivePrivateKey, baseUrl: effectiveBaseUrl });
      BencashDepositService.setRuntimeCredentials(effectiveBaseUrl, effectivePrivateKey);
    }

    if (!txId) {
      return NextResponse.json(
        { resultCode: '400', resultMessage: 'El txId retornado por requestcashin es obligatorio' },
        { status: 400 }
      );
    }

    const result = await executeConfirmCashIn({
      txId: String(txId),
      verifyCode: verifyCode || '1111',
      isConfirm: isConfirm !== undefined ? String(isConfirm) : '1',
      requestId: requestId !== undefined && requestId !== null && String(requestId).trim().length > 0 ? requestId : undefined,
      baseUrl: effectiveBaseUrl,
      privateKey: effectivePrivateKey,
      operator: operator as any,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in /api/channel/confirmcashin proxy:', error);
    return NextResponse.json(
      { resultCode: '500', resultMessage: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

