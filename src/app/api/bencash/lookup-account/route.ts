import { NextRequest, NextResponse } from 'next/server';
import {
  detectHaitiOperator,
  executeConfirmCashIn,
  executeRequestCashIn,
  extractBencashReceiverName,
  formatHaitiPhoneNumber,
} from '@/lib/bencash/service';
import { getPersistentBencashServerConfig } from '@/lib/server-config';
import { getVerifiedNatCashHolder, rememberVerifiedNatCashHolder } from '@/lib/bencash/account-holder-cache';
import { authenticatedUserError, requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

type LookupResult = { body: Record<string, unknown>; status: number };
const lookupInFlight = new Map<string, Promise<LookupResult>>();

function verifiedAccountResponse(cleanPhone: string, accountName: string, message: string, verificationMode: string) {
  const detected = detectHaitiOperator(cleanPhone);
  return {
    success: true,
    valid: true,
    verified: true,
    phone: cleanPhone,
    formattedPhone: `+509 ${cleanPhone.replace(/^509/, '').replace(/(\d{4})(\d{4})/, '$1 $2')}`,
    operator: 'NatCash',
    operatorName: 'Natcom NatCash',
    brandColor: detected.logoColor,
    accountHolder: {
      name: accountName,
      status: 'Active',
      currency: 'HTG',
      kycLevel: 'Titular confirmado por API',
      verified: true,
      network: 'Natcom NatCash',
    },
    currency: 'HTG',
    isRegistered: true,
    status: 'VERIFIED',
    verificationMode,
    message,
  };
}

function unverifiedAccountResponse(cleanPhone: string) {
  const { operator, logoColor } = detectHaitiOperator(cleanPhone);
  const operatorName = operator === 'MonCash' ? 'Digicel MonCash' : operator === 'NatCash' ? 'Natcom NatCash' : 'Operador no identificado';

  return {
    success: true,
    valid: false,
    verified: false,
    phone: cleanPhone,
    formattedPhone: `+509 ${cleanPhone.replace(/^509/, '').replace(/(\d{4})(\d{4})/, '$1 $2')}`,
    operator,
    operatorName,
    brandColor: logoColor,
    accountHolder: null,
    accountId: null,
    currency: 'HTG',
    isRegistered: null,
    status: 'UNVERIFIED',
    message: 'El API de BenCash no publica una ruta para consultar titulares. La cuenta se valida únicamente al crear la solicitud de depósito.',
  };
}

export async function GET(req: NextRequest) {
  try {
    await requireAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);
    const rawPhone = searchParams.get('phone') || '';

    if (!rawPhone || rawPhone.trim().length < 8) {
      return NextResponse.json({
        success: false,
        message: 'Ingrese al menos 8 dígitos del número móvil de Haití',
      }, { status: 400 });
    }

    const cleanPhone = formatHaitiPhoneNumber(rawPhone);
    const detected = detectHaitiOperator(cleanPhone);
    if (detected.operator === 'NatCash') {
      const cached = await getVerifiedNatCashHolder(cleanPhone);
      if (cached) {
        return NextResponse.json(verifiedAccountResponse(
          cleanPhone,
          cached.accountName,
          'Titular recuperado de una validación reciente de NatCash.',
          'recent_cache',
        ));
      }
    }
    return NextResponse.json(unverifiedAccountResponse(cleanPhone));
  } catch (error: any) {
    const authError = authenticatedUserError(error);
    if (authError.status === 401 || authError.status === 403) {
      return NextResponse.json({ success: false, message: authError.message }, { status: authError.status });
    }
    return NextResponse.json({
      success: false,
      message: error?.message || 'Error al consultar titular de la cuenta',
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuthenticatedUser(req);
    const body = await req.json();
    const rawPhone = body.phone || '';

    if (!rawPhone || String(rawPhone).trim().length < 8) {
      return NextResponse.json({
        success: false,
        message: 'Número de teléfono de Haití inválido o incompleto',
      }, { status: 400 });
    }

    const cleanPhone = formatHaitiPhoneNumber(String(rawPhone));
    if (!/^509\d{8}$/.test(cleanPhone)) {
      return NextResponse.json({ success: false, message: 'El número debe contener 8 dígitos de Haití' }, { status: 422 });
    }

    const detected = detectHaitiOperator(cleanPhone);
    if (detected.operator !== 'NatCash') {
      return NextResponse.json({
        success: false,
        message: detected.operator === 'MonCash'
          ? 'MonCash no ofrece consulta previa de titular por número.'
          : 'El número no corresponde a una línea NatCash reconocida.',
      }, { status: 422 });
    }

    const cached = await getVerifiedNatCashHolder(cleanPhone);
    if (cached) {
      return NextResponse.json(verifiedAccountResponse(
        cleanPhone,
        cached.accountName,
        'Titular recuperado de una validación reciente de NatCash.',
        'recent_cache',
      ));
    }

    let lookup = lookupInFlight.get(cleanPhone);
    if (!lookup) {
      lookup = verifyNatCashHolder(cleanPhone);
      lookupInFlight.set(cleanPhone, lookup);
      void lookup.then(
        () => lookupInFlight.delete(cleanPhone),
        () => lookupInFlight.delete(cleanPhone),
      );
    }
    const result = await lookup;
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: any) {
    const authError = authenticatedUserError(error);
    if (authError.status === 401 || authError.status === 403) {
      return NextResponse.json({ success: false, message: authError.message }, { status: authError.status });
    }
    return NextResponse.json({
      success: false,
      message: error?.message || 'Error al procesar consulta de cuenta',
    }, { status: 500 });
  }
}

async function verifyNatCashHolder(cleanPhone: string): Promise<LookupResult> {
  const config = await getPersistentBencashServerConfig();
  if (!config.privateKey) {
    return { body: { success: false, message: 'El canal NatCash no está configurado temporalmente.' }, status: 503 };
  }

  const request = await executeRequestCashIn({
    toAccountNumber: cleanPhone,
    amount: 1,
    content: 'HispaniolaPay - verificacion de titular NatCash',
    baseUrl: config.baseUrl,
    privateKey: config.privateKey,
    autoConfirm: false,
  });
  const accepted = String(request.resultCode) === '200';
  const txId = String(request.result?.txId || '').trim();
  const requestId = request.requestId ?? request.result?.requestId;

  if (!accepted || !txId || requestId === undefined || requestId === null) {
    const providerMessage = String(request.resultMessage || request.message || 'NatCash no pudo validar esta cuenta');
    return {
      body: { success: false, message: providerMessage.replace(/bencash/gi, 'proveedor de pagos') },
      status: 422,
    };
  }

  let cancellation;
  try {
    cancellation = await executeConfirmCashIn({
      requestId,
      txId,
      isConfirm: '0',
      baseUrl: config.baseUrl,
      privateKey: config.privateKey,
    });
  } catch (error) {
    console.error('[NatCash holder lookup] No se pudo cancelar la verificación pendiente:', error);
    return {
      body: {
        success: false,
        message: 'NatCash inició la validación, pero no confirmó su cancelación. No se realizó ningún débito; contacte a soporte antes de reintentar.',
      },
      status: 502,
    };
  }

  if (String(cancellation.resultCode) !== '200') {
    console.error('[NatCash holder lookup] Cancelación rechazada:', cancellation.resultCode, cancellation.resultMessage);
    return {
      body: {
        success: false,
        message: 'NatCash no confirmó la cancelación de la validación. No se realizó ningún débito; contacte a soporte antes de reintentar.',
      },
      status: 502,
    };
  }

  const accountName = extractBencashReceiverName(request);
  if (!accountName) {
    return {
      body: { success: false, message: 'NatCash validó el número, pero no devolvió el nombre del titular.' },
      status: 422,
    };
  }

  await rememberVerifiedNatCashHolder(cleanPhone, accountName).catch((cacheError) => {
    console.warn('[NatCash holder lookup] No se pudo guardar el titular verificado:', cacheError);
  });
  return {
    body: verifiedAccountResponse(
      cleanPhone,
      accountName,
      'Titular confirmado por NatCash. La validación técnica fue cancelada sin débito.',
      'requestcashin_cancelled',
    ),
    status: 200,
  };
}
