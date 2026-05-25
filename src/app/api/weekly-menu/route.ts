import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { setWeeklyMenu } from '@/controllers/weeklyMenuController';


export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const body = await req.json();
    const result = await setWeeklyMenu(session.userId, body);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[WEEKLY MENU POST ERROR]', error);
    return NextResponse.json({ error: 'Gagal menyimpan weekly menu.' }, { status: 500 });
  }
}