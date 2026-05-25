import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { getHealthProfile, updateHealthProfile } from '@/controllers/profileController';
import { validate } from '@/lib/validate';
import { updateHealthSchema } from '@/schemas';


export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  return getHealthProfile(session.userId);
}

export async function PUT(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  const body = await req.json();
  const parsed = validate(updateHealthSchema, body);
  if (!parsed.success) return parsed.response;

  return updateHealthProfile(session.userId, parsed.data);
}