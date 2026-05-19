import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { cancelPO } from '@/controllers/forecastingController';

function authError(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ poId: string }> }) {
  const session = await getSessionUserId(req);
  if ('error' in session) return authError(session.error);

  const { poId } = await params;
  try {
    const result = await cancelPO(session.userId, poId);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (err) {
    console.error('[FORECAST CANCEL ERROR]', err);
    return NextResponse.json({ error: 'Gagal cancel PO.' }, { status: 500 });
  }
}
