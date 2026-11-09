import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { fulfillPO } from '@/controllers/forecastingController';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ poId: string }> }
) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return NextResponse.json({ error: session.error }, { status: 401 });
  }

  const { poId } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const actualQty = body.actualReceivedQtyKg !== undefined ? Number(body.actualReceivedQtyKg) : undefined;

    const result = await fulfillPO(session.userId, poId, actualQty);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses penerimaan PO.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
