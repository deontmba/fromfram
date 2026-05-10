import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { getAllSubscriptions, createSubscription } from '@/controllers/subscriptionController';
import { validate } from '@/lib/validate';
import { createSubscriptionSchema } from '@/schemas';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING')
    return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const result = await getAllSubscriptions();
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[SUBSCRIPTIONS GET ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const body = await req.json();
    const parsed = validate(createSubscriptionSchema, body);
    if (!parsed.success) return parsed.response;

    const result = await createSubscription(session.userId, parsed.data);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[SUBSCRIPTIONS POST ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}