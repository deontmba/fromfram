import { NextRequest, NextResponse } from 'next/server';
import { handleGoogleCallback } from '@/controllers/authController';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code') ?? '';
  const state = url.searchParams.get('state');
  const expectedState = req.cookies.get('oauth_state')?.value;

  if (!state || !expectedState || state !== expectedState) {
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    return NextResponse.redirect(`${BASE_URL}/login?error=google_failed`);
  }

  const response = await handleGoogleCallback(code);
  response.cookies.delete({ name: 'oauth_state', path: '/api/auth/google' });
  return response;
}
