import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { advanceDelivery } from '@/controllers/adminController';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') {
    return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  }
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

type DynamicRouteParams = { id: string };
interface RouteContext { params: Promise<DynamicRouteParams> }

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const result = await advanceDelivery(session.userId, id);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[ADMIN DELIVERY ADVANCE ERROR]', error);
    return NextResponse.json({ error: 'Gagal memajukan status delivery.' }, { status: 500 });
  }
}