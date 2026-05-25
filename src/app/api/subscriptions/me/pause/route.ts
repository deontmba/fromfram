import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { pauseSubscription } from '@/controllers/subscriptionController';
import { validate } from '@/lib/validate';
import { pauseSubscriptionSchema } from '@/schemas';


export async function PATCH(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const body = await req.json();
    const parsed = validate(pauseSubscriptionSchema, body);
    if (!parsed.success) return parsed.response;

    const result = await pauseSubscription(session.userId, parsed.data.resumeDate);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[SUBSCRIPTION PAUSE ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}