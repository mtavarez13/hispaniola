import { NextRequest, NextResponse } from 'next/server';
import { getPartnerByApiKey, calculatePartnerQuote } from '@/lib/partner-service';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SystemSettings } from '@/lib/types';

export const dynamic = 'force-dynamic';

const DEFAULT_RATES = {
  publicRateDOP: 58.50,
  publicRateHTG: 132.20,
  publicRateUSD: 1.00,
  haitiPublicFeePercent: 8.0,
};

async function loadSystemSettings(): Promise<SystemSettings> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'global'));
    if (snap.exists()) {
      return snap.data() as SystemSettings;
    }
  } catch (e) {
    // Fallback
  }
  return DEFAULT_RATES as any;
}

/**
 * POST /api/v1/partner/quote
 * Genera una cotización exacta para el tercero aplicando su % fijado de margen.
 * Autenticación: Header `X-API-Key: hp_live_...`
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization') || '';
    const partner = await getPartnerByApiKey(authHeader);

    if (!partner) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'API Key inválida o no provista en el header X-API-Key' },
        { status: 401 }
      );
    }

    if (partner.status !== 'active') {
      return NextResponse.json(
        { error: 'PARTNER_SUSPENDED', message: `Cuenta de socio '${partner.name}' inactiva o suspendida` },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      sourceCurrency = 'USD',
      targetCurrency = 'HTG',
      operator = 'MonCash',
      sendAmount,
      receiveAmount,
    } = body;

    if ((!sendAmount || Number(sendAmount) <= 0) && (!receiveAmount || Number(receiveAmount) <= 0)) {
      return NextResponse.json(
        { error: 'INVALID_AMOUNT', message: 'Debe especificar sendAmount o receiveAmount mayor a 0' },
        { status: 400 }
      );
    }

    const validSource = ['USD', 'DOP'].includes(sourceCurrency.toUpperCase())
      ? (sourceCurrency.toUpperCase() as 'USD' | 'DOP')
      : 'USD';

    const validTarget = ['HTG', 'DOP', 'USD'].includes(targetCurrency.toUpperCase())
      ? (targetCurrency.toUpperCase() as 'HTG' | 'DOP' | 'USD')
      : 'HTG';

    const settings = await loadSystemSettings();

    const quote = calculatePartnerQuote(partner, settings, {
      sourceCurrency: validSource,
      targetCurrency: validTarget,
      operator,
      sendAmount: sendAmount ? Number(sendAmount) : undefined,
      receiveAmount: receiveAmount ? Number(receiveAmount) : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        quote,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API v1 Partner Quote Error]:', error);
    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: error.message || 'Error procesando la cotización' },
      { status: 400 }
    );
  }
}
