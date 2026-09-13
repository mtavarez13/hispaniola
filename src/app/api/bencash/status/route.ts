import { NextRequest, NextResponse } from 'next/server';
import {
  executeCheckTransactionStatus,
  executeCancelTransaction,
  moncashTransactionStatus,
  moncashCancel,
} from '@/lib/bencash/service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, txId, requestId, baseUrl, privateKey, operator, channel } = body;

    if (!txId) {
      return NextResponse.json(
        { resultCode: '400', resultMessage: 'El txId es requerido', success: false },
        { status: 400 }
      );
    }

    const isMoncash =
      String(operator || channel || '').toLowerCase() === 'moncash' ||
      String(txId).startsWith('mc_');

    // CANCELACIÓN
    if (action === 'cancel') {
      if (isMoncash) {
        // MonCash Cancel: POST /api/channel/moncash/cancel?txid=<txId>
        const res = await moncashCancel(String(txId), {
          baseUrl: baseUrl || process.env.BENCASH_BASE_URL,
          privateKey: privateKey || process.env.BENCASH_PRIVATE_KEY,
        });
        return NextResponse.json({
          success: res.success,
          resultCode: res.resultCode,
          comment: res.comment,
          message: res.comment,
          txId: res.txId,
          operator: 'MonCash',
        });
      }

      // NatCash Cancel
      const res = await executeCancelTransaction({
        txId,
        requestId,
        baseUrl: baseUrl || process.env.BENCASH_BASE_URL,
        privateKey: privateKey || process.env.BENCASH_PRIVATE_KEY,
      });
      return NextResponse.json({
        ...res,
        operator: 'NatCash',
      });
    }

    // CONSULTA DE ESTADO
    if (isMoncash) {
      // MonCash Status: POST /api/channel/moncash/transactionstatus?txid=<txId>
      const res = await moncashTransactionStatus(String(txId), {
        baseUrl: baseUrl || process.env.BENCASH_BASE_URL,
        privateKey: privateKey || process.env.BENCASH_PRIVATE_KEY,
      });

      const isSuccess = String(res.resultCode) === '200' && !res.notFound;
      const rawStatus = (res.status || '').toLowerCase();
      const isCancelled = rawStatus === 'canceled' || rawStatus === 'cancelled';
      const isFailed = rawStatus === 'failed' || rawStatus === 'error';
      // En MonCash, cuando BenCash responde con código 200 (incluso si status dice 'Pending' o 'Waiting validation'),
      // el depósito fue recibido y aceptado por la red Digicel. Se marca como 'confirmed'.
      const statusNormalized = isCancelled ? 'cancelled' : isFailed ? 'failed' : isSuccess ? 'confirmed' : 'pending';

      return NextResponse.json({
        success: isSuccess,
        resultCode: res.resultCode,
        status: statusNormalized === 'confirmed' ? 'Confirmed' : res.status,
        comment: res.comment,
        txId: res.txId,
        operator: 'MonCash',
        endpointUsed: '/api/channel/moncash/transactionstatus',
        transaction: {
          txId: res.txId,
          status: statusNormalized,
          transactionId: res.txId,
          comment: res.comment,
        },
      });
    }

    // NatCash Status
    const res = await executeCheckTransactionStatus({
      txId,
      baseUrl: baseUrl || process.env.BENCASH_BASE_URL,
      privateKey: privateKey || process.env.BENCASH_PRIVATE_KEY,
    });

    const isSuccess = String(res.resultCode) === '200';
    const rawStatus = (res.status || '').toLowerCase();
    const isConfirmed = isSuccess && (rawStatus === 'confirmed' || rawStatus === 'completed' || rawStatus === 'success' || res.isConfirmed);

    return NextResponse.json({
      success: isSuccess,
      ...res,
      operator: 'NatCash',
      endpointUsed: '/api/channel/transactionstatus',
      transaction: {
        txId: res.txId,
        status: isConfirmed ? 'confirmed' : rawStatus || 'pending',
        transactionId: res.txId,
        comment: res.comment || res.resultMessage,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/bencash/status:', error);
    return NextResponse.json(
      { resultCode: '500', resultMessage: error.message || 'Error interno del servidor', success: false },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const txId = searchParams.get('txId');
    const operator = searchParams.get('operator') || searchParams.get('channel') || '';
    const baseUrl = searchParams.get('baseUrl') || undefined;
    const privateKey = searchParams.get('privateKey') || undefined;

    // Si no se especifica txId, responde con el estado general de salud del servicio y canales
    if (!txId) {
      return NextResponse.json({
        success: true,
        online: true,
        gateway: 'BenCash Multi-Channel API',
        moncashEndpoint: '/api/channel/moncash/requestcashin',
        natcashEndpoint: '/api/channel/requestcashin',
        timestamp: Math.floor(Date.now() / 1000),
      });
    }

    const isMoncash = operator.toLowerCase() === 'moncash' || txId.startsWith('mc_');

    if (isMoncash) {
      const res = await moncashTransactionStatus(txId, {
        baseUrl: baseUrl || process.env.BENCASH_BASE_URL,
        privateKey: privateKey || process.env.BENCASH_PRIVATE_KEY,
      });
      const isSuccess = String(res.resultCode) === '200' && !res.notFound;
      const rawStatus = (res.status || '').toLowerCase();
      const isCancelled = rawStatus === 'canceled' || rawStatus === 'cancelled';
      const isFailed = rawStatus === 'failed' || rawStatus === 'error';
      const statusNormalized = isCancelled ? 'cancelled' : isFailed ? 'failed' : isSuccess ? 'confirmed' : 'pending';

      return NextResponse.json({
        success: isSuccess,
        resultCode: res.resultCode,
        status: statusNormalized === 'confirmed' ? 'Confirmed' : res.status,
        comment: res.comment,
        txId: res.txId,
        operator: 'MonCash',
        endpointUsed: '/api/channel/moncash/transactionstatus',
        transaction: {
          txId: res.txId,
          status: statusNormalized,
          transactionId: res.txId,
          comment: res.comment,
        },
      });
    }

    const res = await executeCheckTransactionStatus({
      txId,
      baseUrl: baseUrl || process.env.BENCASH_BASE_URL,
      privateKey: privateKey || process.env.BENCASH_PRIVATE_KEY,
    });
    const isSuccess = String(res.resultCode) === '200';
    const rawStatus = (res.status || '').toLowerCase();
    const isConfirmed = isSuccess && (rawStatus === 'confirmed' || rawStatus === 'completed' || rawStatus === 'success' || res.isConfirmed);

    return NextResponse.json({
      success: isSuccess,
      ...res,
      operator: 'NatCash',
      transaction: {
        txId: res.txId,
        status: isConfirmed ? 'confirmed' : rawStatus || 'pending',
        transactionId: res.txId,
        comment: res.comment || res.resultMessage,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/bencash/status:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
