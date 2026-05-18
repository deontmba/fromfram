import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { getRecentActivities } from '@/controllers/adminController';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') {
    return NextResponse.json(
      { error: 'Server auth configuration missing.' },
      { status: 500 }
    );
  }
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') ?? '10');

    const result = await getRecentActivities(session.userId, limit);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[ADMIN DASHBOARD ACTIVITIES GET ERROR]', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data aktivitas.' },
      { status: 500 }
    );
  }
}