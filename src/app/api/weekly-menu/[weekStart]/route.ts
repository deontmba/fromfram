import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { getWeeklyMenuByWeekStart } from '@/controllers/weeklyMenuController';


type DynamicRouteParams = { weekStart: string };
interface RouteContext { params: Promise<DynamicRouteParams> }

export async function GET(req: NextRequest, context: RouteContext) {
  const { weekStart: weekStartParam } = await context.params;

  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const result = await getWeeklyMenuByWeekStart(weekStartParam);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[WEEKLY MENU GET ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil weekly menu.' }, { status: 500 });
  }
}