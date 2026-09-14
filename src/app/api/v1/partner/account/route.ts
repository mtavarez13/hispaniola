import { NextRequest, NextResponse } from 'next/server';
import { getPartnerByApiKey, updatePartner } from '@/lib/partner-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization') || '';
    const partner = await getPartnerByApiKey(authHeader);

    if (!partner) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'API Key inválida' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        account: {
          id: partner.id,
          name: partner.name,
          company: partner.company,
          email: partner.email,
          phone: partner.phone,
          status: partner.status,
          // % FIJADO AL TERCERO
          marginPercent: partner.marginPercent,
          commissionType: partner.commissionType,
          fixedFeeUSD: partner.fixedFeeUSD || 0,
          // Balances
          walletBalanceUSD: partner.walletBalanceUSD,
          creditLimitUSD: partner.creditLimitUSD,
          availableFundsUSD: partner.walletBalanceUSD + partner.creditLimitUSD,
          // Métricas acumuladas
          totalVolumeUSD: partner.totalVolumeUSD,
          totalTransactions: partner.totalTransactions,
          totalCommissionEarnedUSD: partner.totalCommissionEarnedUSD,
          // Webhooks
          webhookUrl: partner.webhookUrl || null,
          allowedCorridors: partner.allowedCorridors,
          createdAt: partner.createdAt,
          lastUsedAt: partner.lastUsedAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization') || '';
    const partner = await getPartnerByApiKey(authHeader);

    if (!partner) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'API Key inválida' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { webhookUrl, phone, company } = body;

    const updates: any = {};
    if (webhookUrl !== undefined) updates.webhookUrl = webhookUrl;
    if (phone !== undefined) updates.phone = phone;
    if (company !== undefined) updates.company = company;

    const updated = await updatePartner(partner.id, updates);

    return NextResponse.json(
      {
        success: true,
        message: 'Datos de cuenta y webhook actualizados correctamente',
        account: updated,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
