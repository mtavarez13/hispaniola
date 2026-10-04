import { NextRequest, NextResponse } from 'next/server';
import { formatHaitiPhoneNumber, detectHaitiOperator } from '@/lib/bencash/service';

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
    const { searchParams } = new URL(req.url);
    const rawPhone = searchParams.get('phone') || '';

    if (!rawPhone || rawPhone.trim().length < 8) {
      return NextResponse.json({
        success: false,
        message: 'Ingrese al menos 8 dígitos del número móvil de Haití',
      }, { status: 400 });
    }

    const cleanPhone = formatHaitiPhoneNumber(rawPhone);
    return NextResponse.json(unverifiedAccountResponse(cleanPhone));
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error?.message || 'Error al consultar titular de la cuenta',
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPhone = body.phone || '';

    if (!rawPhone || String(rawPhone).trim().length < 8) {
      return NextResponse.json({
        success: false,
        message: 'Número de teléfono de Haití inválido o incompleto',
      }, { status: 400 });
    }

    const cleanPhone = formatHaitiPhoneNumber(String(rawPhone));
    return NextResponse.json(unverifiedAccountResponse(cleanPhone));
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error?.message || 'Error al procesar consulta de cuenta',
    }, { status: 500 });
  }
}
