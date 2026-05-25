import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { getAdminDashboardStats } from '@/controllers/adminController';


export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const result = await getAdminDashboardStats(session.userId);

    if (result && 'error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result?.data, { status: result?.status || 200 });
  } catch (error) {
    console.error('[ADMIN DASHBOARD STATS GET ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil data dashboard.' }, { status: 500 });
  }
}
