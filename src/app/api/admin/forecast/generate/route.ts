import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { generateForecast } from '@/controllers/forecastingController';

function authError(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return authError(session.error);

  try {
    const body = await req.json();
    const result = await generateForecast(session.userId, body.weekStartDate);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (err) {
    console.error('[FORECAST GENERATE ERROR]', err);
    return NextResponse.json({ error: 'Gagal generate forecast.' }, { status: 500 });
  }
}
