import { NextRequest, NextResponse } from 'next/server';
import { getPartnerByApiKey } from '@/lib/partner-service';
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
    // Fallback silencioso a tasas por defecto
  }
  return DEFAULT_RATES as any;
}

/**
 * GET /api/v1/partner/rates
 * Retorna las tasas de cambio vigentes con el % de comisión/margen asignado al socio tercero.
 * Autenticación: Header `X-API-Key: hp_live_...` o `Authorization: Bearer hp_live_...`
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization') || '';
    const partner = await getPartnerByApiKey(authHeader);

    if (!partner) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'API Key inválida o no proporcionada. Envíe su clave en el header X-API-Key: hp_live_...',
        },
        { status: 401 }
      );
    }

    if (partner.status !== 'active') {
      return NextResponse.json(
        {
          error: 'PARTNER_SUSPENDED',
          message: `La cuenta de API para '${partner.name}' está actualmente ${partner.status}. Contacte a soporte de HispaniolaPay.`,
        },
        { status: 403 }
      );
    }

    const settings = await loadSystemSettings();
    const publicRateDOP = Number(settings.publicRateDOP) || 58.5;
    const publicRateHTG = Number(settings.publicRateHTG) || 132.2;
    const marginPct = Number(partner.marginPercent) || 0; // % Fijado para el tercero

    // Tasa cruzada DOP -> HTG
    const crossRateDopToHtg = Math.round((publicRateHTG / publicRateDOP) * 1000) / 1000;

    return NextResponse.json(
      {
        success: true,
        partner: {
          id: partner.id,
          name: partner.name,
          company: partner.company,
          marginPercent: marginPct, // % FIJADO A ESTE TERCERO
          commissionType: partner.commissionType,
          fixedFeeUSD: partner.fixedFeeUSD || 0,
          status: partner.status,
          currency: 'USD',
        },
        rates: {
          USD_HTG: {
            pair: 'USD/HTG',
            baseRate: publicRateHTG,
            effectiveRate: publicRateHTG,
            description: '1 Dólar Estadounidense en Gourdes Haitianos (MonCash / NatCash)',
          },
          DOP_HTG: {
            pair: 'DOP/HTG',
            baseRate: crossRateDopToHtg,
            effectiveRate: crossRateDopToHtg,
            description: '1 Peso Dominicano en Gourdes Haitianos',
          },
          USD_DOP: {
            pair: 'USD/DOP',
            baseRate: publicRateDOP,
            effectiveRate: publicRateDOP,
            description: '1 Dólar Estadounidense en Pesos Dominicanos (Bancos RD)',
          },
        },
        partnerBenefitRules: {
          agreedMarginPercent: marginPct,
          explanation: `Para cada transferencia procesada, el sistema de '${partner.name}' recibe un ${marginPct}% de beneficio directo sobre el volumen USD enviado, debitando únicamente el monto neto de su saldo B2B.`,
          exampleCalculation: {
            sendingUSD: 100.0,
            recipientReceivesHTG: Math.round(100.0 * publicRateHTG),
            partnerCommissionEarnedUSD: Math.round(100.0 * (marginPct / 100) * 100) / 100,
            partnerNetDebitedUSD: Math.round((100.0 - 100.0 * (marginPct / 100)) * 100) / 100,
          },
        },
        supportedOperators: [
          { id: 'MonCash', name: 'Digicel MonCash (Haití)', currency: 'HTG', type: 'mobile_wallet', instant: true },
          { id: 'NatCash', name: 'Natcom NatCash (Haití)', currency: 'HTG', type: 'mobile_wallet', instant: true },
          { id: 'Banreservas', name: 'Banco de Reservas (Rep. Dominicana)', currency: 'DOP', type: 'bank_account', instant: true },
          { id: 'Banco BHD', name: 'Banco BHD (Rep. Dominicana)', currency: 'DOP', type: 'bank_account', instant: true },
          { id: 'Banco Popular', name: 'Banco Popular Dominicano (Rep. Dominicana)', currency: 'DOP', type: 'bank_account', instant: true },
        ],
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API v1 Partner Rates Error]:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: error.message || 'Error al obtener tasas de cambio' },
      { status: 500 }
    );
  }
}
