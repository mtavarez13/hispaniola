import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllPartners, 
  createPartner, 
  updatePartner, 
  deletePartner, 
  generatePartnerApiKey,
  getPartnerTransfers
} from '@/lib/partner-service';
import { ApiPartner } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/partner/admin
 * Lista todos los socios API con sus métricas y porcentajes configurados.
 */
export async function GET() {
  try {
    const partners = await getAllPartners();
    const recentTransfers = await getPartnerTransfers(undefined, 20);

    // Calcular estadísticas globales
    const totalVolumeUSD = partners.reduce((acc, p) => acc + (p.totalVolumeUSD || 0), 0);
    const totalTransactions = partners.reduce((acc, p) => acc + (p.totalTransactions || 0), 0);
    const totalCommissionEarnedUSD = partners.reduce((acc, p) => acc + (p.totalCommissionEarnedUSD || 0), 0);
    const totalCustodyBalanceUSD = partners.reduce((acc, p) => acc + (p.walletBalanceUSD || 0), 0);

    return NextResponse.json(
      {
        success: true,
        stats: {
          totalPartners: partners.length,
          activePartners: partners.filter((p) => p.status === 'active').length,
          totalVolumeUSD: Math.round(totalVolumeUSD * 100) / 100,
          totalTransactions,
          totalCommissionEarnedUSD: Math.round(totalCommissionEarnedUSD * 100) / 100,
          totalCustodyBalanceUSD: Math.round(totalCustodyBalanceUSD * 100) / 100,
        },
        partners,
        recentTransfers,
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

/**
 * POST /api/partner/admin
 * Registra un nuevo socio B2B y fija su % de beneficio/margen.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      company,
      email,
      phone,
      marginPercent = 3.0, // Requerimiento principal: % fijado al tercero
      commissionType = 'percentage_margin',
      fixedFeeUSD = 0,
      initialBalanceUSD = 0,
      creditLimitUSD = 0,
      webhookUrl,
      allowedCorridors = ['DO_TO_HT', 'US_TO_HT', 'US_TO_DO'],
      notes,
    } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'El nombre y correo electrónico son requeridos' },
        { status: 400 }
      );
    }

    const apiKey = generatePartnerApiKey('hp_live_');

    const newPartner = await createPartner({
      name,
      company: company || name,
      email,
      phone,
      apiKey,
      status: 'active',
      marginPercent: Number(marginPercent), // % fijado al tercero
      commissionType,
      fixedFeeUSD: Number(fixedFeeUSD),
      walletBalanceUSD: Number(initialBalanceUSD),
      creditLimitUSD: Number(creditLimitUSD),
      webhookUrl: webhookUrl || undefined,
      allowedCorridors,
      notes,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Socio API '${name}' creado exitosamente con margen fijado al ${marginPercent}%`,
        partner: newPartner,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'CREATE_ERROR', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/partner/admin
 * Modifica parámetros de un socio, especialmente su % fijado o clave API.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { partnerId, regenerateApiKey, ...updates } = body;

    if (!partnerId) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'partnerId es requerido' },
        { status: 400 }
      );
    }

    if (regenerateApiKey) {
      updates.apiKey = generatePartnerApiKey('hp_live_');
    }

    if (updates.marginPercent !== undefined) {
      updates.marginPercent = Number(updates.marginPercent);
    }

    const updated = await updatePartner(partnerId, updates);

    return NextResponse.json(
      {
        success: true,
        message: 'Configuración de socio API actualizada',
        partner: updated,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'UPDATE_ERROR', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/partner/admin
 * Revoca o elimina el socio API.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get('partnerId');

    if (!partnerId) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'partnerId es requerido' },
        { status: 400 }
      );
    }

    await deletePartner(partnerId);

    return NextResponse.json(
      { success: true, message: `Socio API '${partnerId}' revocado y eliminado` },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'DELETE_ERROR', message: error.message },
      { status: 500 }
    );
  }
}
