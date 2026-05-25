import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { getDeliveryById } from '@/controllers/deliveryController';


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'ID pengiriman diperlukan.' }, { status: 400 });
  }

  try {
    const result = await getDeliveryById(session.userId, id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[DELIVERY DETAIL GET ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil detail pengiriman.' }, { status: 500 });
  }
}