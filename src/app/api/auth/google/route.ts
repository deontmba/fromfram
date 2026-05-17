import { NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/controllers/authController';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'Missing Google OAuth config' }, { status: 500 });
  }

  return NextResponse.redirect(getGoogleAuthUrl());
}