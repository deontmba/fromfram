import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { confirmPO, cancelPO } from '@/controllers/forecastingController';

function authError(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

// PATCH /api/admin/forecast/[poId]/confirm
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ poId: string }> }) {
  const session = await getSessionUserId(req);
  if ('error' in session) return authError(session.error);

  const { poId } = await params;
  const url = req.nextUrl.pathname;

  try {
    if (url.endsWith('/confirm')) {
      const body = await req.json().catch(() => ({}));
      const result = await confirmPO(session.userId, poId, body.orderedQtyKg);
      if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result.data, { status: result.status });
    }

    if (url.endsWith('/cancel')) {
      const result = await cancelPO(session.userId, poId);
      if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json(result.data, { status: result.status });
    }

    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  } catch (err) {
    console.error('[FORECAST PO ACTION ERROR]', err);
    return NextResponse.json({ error: 'Gagal memproses PO.' }, { status: 500 });
  }
}
