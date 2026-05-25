import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { getTodayDelivery } from '@/controllers/deliveryController';


export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const result = await getTodayDelivery(session.userId);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[TODAY DELIVERY GET ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil data pengiriman hari ini.' }, { status: 500 });
  }
}