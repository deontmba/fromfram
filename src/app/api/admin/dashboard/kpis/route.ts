import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { getDashboardKpis } from '@/controllers/adminController';


export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const result = await getDashboardKpis(session.userId);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[ADMIN DASHBOARD KPIS GET ERROR]', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data KPI dashboard.' },
      { status: 500 }
    );
  }
}