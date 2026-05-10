import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { cancelSubscription } from '@/controllers/subscriptionController';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') {
    return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  }
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const result = await cancelSubscription(session.userId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[SUBSCRIPTION CANCEL ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}