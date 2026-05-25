import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { lockCurrentWeeklyBox } from '@/controllers/weeklyBoxController';


export async function PATCH(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  try {
    const result = await lockCurrentWeeklyBox(session.userId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[WEEKLY BOX CURRENT LOCK ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengunci weekly box.' }, { status: 500 });
  }
}