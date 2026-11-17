import { NextRequest } from 'next/server';
import { getMe } from '@/controllers/authController';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  return getMe(session.userId);
}
