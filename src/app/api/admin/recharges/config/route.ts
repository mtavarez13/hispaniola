import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { adminAuthError, requireAdmin } from '@/lib/server-auth';
import { getRecargasConfig, saveRecargasConfig, verifyRecargasConnection } from '@/lib/recargas-dominicanas';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req, { requireSettings: true });
    const [config, catalog] = await Promise.all([
      getRecargasConfig(),
      adminDb.collection('provider_catalogs').doc('recargas_dominicanas').get(),
    ]);
    const catalogData = catalog.data() || {};
    return NextResponse.json({
      success: true,
      config: {
        enabled: config.enabled,
        baseUrl: config.baseUrl,
        username: config.username,
        feePercent: config.feePercent,
        hasPassword: Boolean(config.password),
      },
      catalog: {
        businessName: String(catalogData.businessName || ''),
        productCount: Number(catalogData.productCount || 0),
        syncedAt: catalogData.syncedAt?.toDate?.()?.toISOString?.() || null,
      },
    });
  } catch (error) {
    const authError = adminAuthError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req, { requireSettings: true });
    const body = await req.json();
    const action = String(body.action || 'save');
    if (action === 'test') {
      const saved = await saveRecargasConfig({
        enabled: body.enabled !== false,
        baseUrl: String(body.baseUrl || ''),
        username: String(body.username || ''),
        password: body.password ? String(body.password) : undefined,
        feePercent: Number(body.feePercent || 0),
      });
      const { profile, business, products } = await verifyRecargasConnection();
      await adminDb.collection('provider_catalogs').doc('recargas_dominicanas').set({
        products,
        businessName: String((business as any)?.name || ''),
        productCount: products.length,
        syncedAt: FieldValue.serverTimestamp(),
        syncedBy: admin.email,
      }, { merge: true });
      await adminDb.collection('accounting_ledger').add({
        type: 'recargas_connection_verified', direction: 'neutral', amountDOP: 0,
        description: `Conexión verificada con ${saved.baseUrl}`,
        performedBy: admin.email, createdAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, profile, business, products, feePercent: saved.feePercent });
    }
    const config = await saveRecargasConfig({
      enabled: body.enabled === true,
      baseUrl: String(body.baseUrl || ''),
      username: String(body.username || ''),
      password: body.password ? String(body.password) : undefined,
      feePercent: Number(body.feePercent || 0),
    });
    await adminDb.collection('accounting_ledger').add({
      type: 'recargas_config_update',
      direction: 'neutral',
      amountDOP: 0,
      description: `Recargas Dominicanas ${config.enabled ? 'habilitado' : 'deshabilitado'} · tarifa ${config.feePercent}%`,
      performedBy: admin.email,
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ success: true, hasPassword: Boolean(config.password) });
  } catch (error) {
    const authError = adminAuthError(error);
    if (authError.status === 401 || String(error).includes('FORBIDDEN')) {
      return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
    }
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'No se pudo guardar la configuración' }, { status: 502 });
  }
}

