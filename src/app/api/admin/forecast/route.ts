import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { generateForecast, getWeeklyForecast } from '@/controllers/forecastingController';

function authError(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return authError(session.error);

  const { searchParams } = new URL(req.url);
  const week = searchParams.get('week');
  if (!week) return NextResponse.json({ error: 'Query param ?week=YYYY-MM-DD diperlukan.' }, { status: 400 });

  try {
    const result = await getWeeklyForecast(session.userId, week);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (err) {
    console.error('[FORECAST GET ERROR]', err);
    return NextResponse.json({ error: 'Gagal mengambil data forecast.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return authError(session.error);

  try {
    const body = await req.json();
    const reqHost = req.headers.get('host') || req.headers.get('x-forwarded-host');
    const result = await generateForecast(session.userId, body.weekStartDate, reqHost);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (err) {
    console.error('[FORECAST POST ERROR]', err);
    return NextResponse.json({ error: 'Gagal generate forecast.' }, { status: 500 });
  }
}
