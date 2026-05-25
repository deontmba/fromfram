import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { getDeliveries } from '@/controllers/deliveryController';


export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const result = await getDeliveries(session.userId);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[DELIVERIES GET ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil data pengiriman.' }, { status: 500 });
  }
}