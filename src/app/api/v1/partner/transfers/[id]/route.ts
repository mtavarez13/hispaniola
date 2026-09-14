import { NextRequest, NextResponse } from 'next/server';
import { getPartnerByApiKey } from '@/lib/partner-service';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PartnerTransfer } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization') || '';
    const partner = await getPartnerByApiKey(authHeader);

    if (!partner) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'API Key inválida' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'ID de transferencia requerido' },
        { status: 400 }
      );
    }

    let transfer: PartnerTransfer | null = null;

    // 1. Buscar por Document ID directo
    try {
      const snap = await getDoc(doc(db, 'partner_transfers', id));
      if (snap.exists()) {
        transfer = { id: snap.id, ...snap.data() } as PartnerTransfer;
      }
    } catch (e) {}

    // 2. Si no encontró por docId, buscar por trackingCode o partnerReference
    if (!transfer) {
      try {
        const q = query(
          collection(db, 'partner_transfers'),
          where('trackingCode', '==', id),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          transfer = { id: snap.docs[0].id, ...snap.docs[0].data() } as PartnerTransfer;
        }
      } catch (e) {}
    }

    if (!transfer) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: `Transferencia con identificador '${id}' no encontrada` },
        { status: 404 }
      );
    }

    // Asegurar que el partner solo vea sus propias órdenes
    if (transfer.partnerId !== partner.id) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'No tiene permiso para ver esta transferencia' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        transfer,
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
