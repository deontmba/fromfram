import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { getTransactionStatus } from '@/controllers/transactionController';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') {
    return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  }
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

type DynamicRouteParams = { id: string };
interface RouteContext { params: Promise<DynamicRouteParams> }

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const result = await getTransactionStatus(session.userId, id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[TRANSACTIONS STATUS GET ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil status transaction.' }, { status: 500 });
  }
}