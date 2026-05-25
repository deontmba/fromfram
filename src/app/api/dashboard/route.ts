import { NextRequest, NextResponse } from 'next/server';
import { getDashboard } from '@/controllers/dashboardController';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';


export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  return getDashboard(session.userId);
}