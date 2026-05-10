import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { generateTransaction } from '@/controllers/transactionController';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') {
    return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  }
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount);

    const result = await generateTransaction(session.userId, amount);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[TRANSACTIONS GENERATE ERROR]', error);
    return NextResponse.json({ error: 'Gagal membuat transaction.' }, { status: 500 });
  }
}