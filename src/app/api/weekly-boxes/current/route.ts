import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { getCurrentWeeklyBox } from '@/controllers/weeklyBoxController';


export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  try {
    const result = await getCurrentWeeklyBox(session.userId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[WEEKLY BOX CURRENT GET ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil weekly box saat ini.' }, { status: 500 });
  }
}