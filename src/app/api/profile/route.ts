import { NextRequest, NextResponse } from 'next/server';
import { getProfile, updateProfile } from '@/controllers/profileController';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { validate } from '@/lib/validate';
import { updateProfileSchema } from '@/schemas';


export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if (!('userId' in session)) return getAuthErrorResponse(session.error);

  return getProfile(session.userId);
}

export async function PUT(req: NextRequest) {
  const session = await getSessionUserId(req);
  if (!('userId' in session)) return getAuthErrorResponse(session.error);

  const body = await req.json();
  const parsed = validate(updateProfileSchema, body);
  if (!parsed.success) return parsed.response;

  return updateProfile(session.userId, parsed.data);
}