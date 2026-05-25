import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { getAllWeeklyBoxes } from '@/controllers/weeklyBoxController';


export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  try {
    const result = await getAllWeeklyBoxes(session.userId);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[WEEKLY BOXES GET ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil weekly boxes.' }, { status: 500 });
  }
}