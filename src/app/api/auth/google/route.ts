import { NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/controllers/authController';

export async function GET() {
  const authUrl = getGoogleAuthUrl();
  return NextResponse.redirect(authUrl);
}