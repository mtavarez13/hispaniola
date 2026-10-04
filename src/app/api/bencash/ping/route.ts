import { NextRequest, NextResponse } from 'next/server';
import { BencashDepositService } from '@/lib/bencash/service';
import { getPersistentBencashServerConfig } from '@/lib/server-config';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const savedConfig = await getPersistentBencashServerConfig();
  let targetUrl = savedConfig.baseUrl || 'https://reseller.test.bencashgroup.com';
  let privateKey: string | undefined = savedConfig.privateKey || undefined;

  try {
    const body = await req.json().catch(() => ({}));
    if (body.baseUrl && typeof body.baseUrl === 'string' && body.baseUrl.trim().length > 0) {
      targetUrl = body.baseUrl.trim();
    } else if (!savedConfig.baseUrl && process.env.BENCASH_BASE_URL) {
      targetUrl = process.env.BENCASH_BASE_URL.trim();
    }
    if (body.privateKey && typeof body.privateKey === 'string') {
      privateKey = body.privateKey.trim();
    } else if (!savedConfig.privateKey && process.env.BENCASH_PRIVATE_KEY) {
      privateKey = process.env.BENCASH_PRIVATE_KEY.trim();
    }
  } catch {
    // default
  }

  // Ensure protocol
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = `https://${targetUrl}`;
  }

  const service = new BencashDepositService({
    baseUrl: targetUrl,
    privateKey,
  });

  const diagnostic = await service.ping({
    baseUrl: targetUrl,
    privateKey,
    timeoutMs: 8000,
  });

  return NextResponse.json(diagnostic, { status: 200 });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const baseUrl = url.searchParams.get('url') || process.env.BENCASH_BASE_URL || 'https://reseller.test.bencashgroup.com';
  const privateKey = url.searchParams.get('key') || process.env.BENCASH_PRIVATE_KEY || undefined;

  const postReq = new NextRequest(req.url, {
    method: 'POST',
    body: JSON.stringify({ baseUrl, privateKey }),
    headers: { 'Content-Type': 'application/json' },
  });

  return POST(postReq);
}
