import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { advanceDelivery } from '@/controllers/adminController';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') {
    return NextResponse.json(
      { error: 'Server auth configuration missing.' },
      { status: 500 }
    );
  }
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  const { id } = await params;

  try {
    const result = await advanceDelivery(session.userId, id);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[ADMIN ADVANCE DELIVERY PATCH ERROR]', error);
    return NextResponse.json(
      { error: 'Gagal memajukan status delivery.' },
      { status: 500 }
    );
  }
}