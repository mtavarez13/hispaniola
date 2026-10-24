import { NextRequest, NextResponse } from 'next/server';
import {
  detectHaitiOperator,
  formatHaitiPhoneNumber,
} from '@/lib/bencash/service';
import { getVerifiedNatCashHolder } from '@/lib/bencash/account-holder-cache';
import { authenticatedUserError, requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

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

    return NextResponse.json({
      ...unverifiedAccountResponse(cleanPhone),
      success: false,
      message: 'Para consultar el titular, ingrese el número y el monto y pulse Revisar envío. NatCash mostrará el nombre antes de confirmar.',
    }, { status: 409 });
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
