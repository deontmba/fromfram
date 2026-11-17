import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getGoogleAuthUrl } from '@/controllers/authController';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'Missing Google OAuth config' }, { status: 500 });
  }

  // CSRF protection: the callback only accepts a state matching this cookie.
  const state = randomBytes(16).toString('hex');
  const response = NextResponse.redirect(getGoogleAuthUrl(state));
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/api/auth/google',
  });
  return response;
}
