import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { confirmAllPO } from '@/controllers/forecastingController';

function authError(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

// PATCH /api/admin/forecast/confirm-all
export async function PATCH(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return authError(session.error);

  try {
    const body = await req.json();
    const result = await confirmAllPO(session.userId, body.weekStartDate);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (err) {
    console.error('[FORECAST CONFIRM-ALL ERROR]', err);
    return NextResponse.json({ error: 'Gagal konfirmasi semua PO.' }, { status: 500 });
  }
}
