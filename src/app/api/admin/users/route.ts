import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { getAdminUsers } from '@/controllers/adminController';

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

    const result = await getAdminUsers(session.userId, {
      search: searchParams.get('search'),
      status: searchParams.get('status'),
      plan: searchParams.get('plan'),
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[ADMIN USERS GET ERROR]', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data users.' },
      { status: 500 }
    );
  }
}