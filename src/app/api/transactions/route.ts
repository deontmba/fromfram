import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { getAllTransactions } from '@/controllers/transactionController';


export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const result = await getAllTransactions(session.userId);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[TRANSACTIONS GET ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil transaction.' }, { status: 500 });
  }
}