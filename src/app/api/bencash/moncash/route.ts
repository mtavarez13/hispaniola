import { NextRequest, NextResponse } from 'next/server';
import {
  moncashRequestCashIn,
  moncashTransactionStatus,
  moncashCancel,
  generateMoncashRequestCashInSignature,
} from '@/lib/bencash/service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'requestcashin', ...params } = body;

    // 1. Solicitud de Cash-in
    if (action === 'requestcashin') {
      const { toAccountNumber, amount, content, requestId, timestamp, baseUrl, privateKey } = params;
      if (!toAccountNumber || !amount) {
        return NextResponse.json(
          { resultCode: '400', message: 'toAccountNumber y amount son requeridos' },
          { status: 400 }
        );
      }

      const res = await moncashRequestCashIn({
        toAccountNumber,
        amount: Number(amount),
        content,
        requestId,
        timestamp,
        baseUrl,
        privateKey,
      });

      return NextResponse.json(res);
    }

    // 2. Consulta de Estado de Transacción
    if (action === 'transactionstatus' || action === 'status') {
      const { txId, baseUrl, privateKey } = params;
      if (!txId) {
        return NextResponse.json(
          { resultCode: '400', comment: 'El parámetro txId es requerido', notFound: true },
          { status: 400 }
        );
      }

      const res = await moncashTransactionStatus(txId, { baseUrl, privateKey });
      return NextResponse.json(res);
    }

    // 3. Cancelación de Transacción
    if (action === 'cancel') {
      const { txId, checkPendingFirst = false, baseUrl, privateKey } = params;
      if (!txId) {
        return NextResponse.json(
          { resultCode: '400', comment: 'El parámetro txId es requerido', success: false },
          { status: 400 }
        );
      }

      const res = await moncashCancel(txId, {
        baseUrl,
        privateKey,
        checkPendingFirst,
      });
      return NextResponse.json(res);
    }

    // 4. Utilidad para calcular firma
    if (action === 'signature') {
      const { requestId, toAccountNumber, amount, content, timestamp, privateKey } = params;
      if (!requestId || !toAccountNumber || !amount || !timestamp) {
        return NextResponse.json(
          { error: 'requestId, toAccountNumber, amount y timestamp son requeridos' },
          { status: 400 }
        );
      }
      const signature = generateMoncashRequestCashInSignature({
        requestId,
        toAccountNumber,
        amount: Number(amount),
        content,
        timestamp: Number(timestamp),
        privateKey,
      });
      return NextResponse.json({ signature });
    }

    return NextResponse.json(
      { resultCode: '400', message: `Acción desconocida: '${action}'. Acciones válidas: requestcashin, transactionstatus, cancel, signature` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in /api/bencash/moncash:', error);
    return NextResponse.json(
      { resultCode: '500', message: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
