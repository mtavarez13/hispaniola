import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { authenticatedUserError, requireAuthenticatedUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';
const money = (value: unknown) => Math.round(Number(value || 0) * 100) / 100;
const iso = (data: Record<string, any>) => String(data.createdAtIso || data.completedAt?.toDate?.()?.toISOString?.() || data.createdAt?.toDate?.()?.toISOString?.() || '');

export async function GET(req: NextRequest) {
  try {
    const identity = await requireAuthenticatedUser(req);
    const fromRaw = req.nextUrl.searchParams.get('from') || '';
    const toRaw = req.nextUrl.searchParams.get('to') || '';
    const from = fromRaw ? new Date(`${fromRaw}T00:00:00.000-04:00`) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = toRaw ? new Date(`${toRaw}T23:59:59.999-04:00`) : new Date();
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      return NextResponse.json({ success: false, error: 'Rango de fecha inválido' }, { status: 400 });
    }
    const maximumRange = 366 * 24 * 60 * 60 * 1000;
    if (to.getTime() - from.getTime() > maximumRange) {
      return NextResponse.json({ success: false, error: 'El rango máximo permitido es de 366 días' }, { status: 400 });
    }

    const [remittances, services, redemptions] = await Promise.all([
      adminDb.collection('mobile_remittances').where('userId', '==', identity.uid).limit(1000).get(),
      adminDb.collection('recharge_transactions').where('uid', '==', identity.uid).limit(1000).get(),
      adminDb.collection('benefit_redemptions').where('userId', '==', identity.uid).limit(500).get(),
    ]);
    const inRange = (date: string) => {
      const time = Date.parse(date);
      return Number.isFinite(time) && time >= from.getTime() && time <= to.getTime();
    };
    const items: Array<Record<string, unknown>> = [];
    for (const document of remittances.docs) {
      const data = document.data(); const createdAt = iso(data); const amountDOP = money(data.benefitEarnedDOP);
      if (data.status !== 'completed' || amountDOP <= 0 || !inRange(createdAt)) continue;
      items.push({ id: document.id, source: 'remittance', sourceLabel: `Remesa ${String(data.operator || '')}`.trim(), description: String(data.recipientName || 'Destinatario'), amountDOP, ratePercent: money(data.benefitRatePercent), createdAt });
    }
    for (const document of services.docs) {
      const data = document.data(); const createdAt = iso(data); const amountDOP = money(data.agentBenefitDOP);
      if (data.status !== 'completed' || amountDOP <= 0 || !inRange(createdAt)) continue;
      items.push({ id: document.id, source: 'service', sourceLabel: String(data.productName || data.action || 'Servicio'), description: String(data.target || ''), amountDOP, createdAt });
    }
    const redemptionItems = redemptions.docs.map((document) => {
      const data = document.data(); return { id: document.id, amountDOP: money(data.amountDOP), createdAt: iso(data) };
    }).filter((item) => item.amountDOP > 0 && inRange(item.createdAt));
    items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const remittanceDOP = money(items.filter((item) => item.source === 'remittance').reduce((sum, item) => sum + Number(item.amountDOP), 0));
    const servicesDOP = money(items.filter((item) => item.source === 'service').reduce((sum, item) => sum + Number(item.amountDOP), 0));
    const redeemedDOP = money(redemptionItems.reduce((sum, item) => sum + item.amountDOP, 0));
    return NextResponse.json({ success: true, from: fromRaw, to: toRaw, summary: { remittanceDOP, servicesDOP, generatedDOP: money(remittanceDOP + servicesDOP), redeemedDOP }, items, redemptions: redemptionItems.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  } catch (error) {
    const authError = authenticatedUserError(error);
    return NextResponse.json({ success: false, error: authError.message }, { status: authError.status });
  }
}
