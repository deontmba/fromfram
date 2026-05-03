import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { getDeliveryById } from '@/controllers/deliveryController';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') {
    return NextResponse.json(
      { error: 'Server auth configuration missing.' },
      { status: 500 },
    );
  }
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { message: 'ID pengiriman diperlukan.' },
      { status: 400 },
    );
  }

  return getDeliveryById(session.userId, id);
}