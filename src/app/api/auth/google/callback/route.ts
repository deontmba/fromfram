import { NextRequest } from 'next/server';
import { handleGoogleCallback } from '@/controllers/authController';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code') ?? '';
  return handleGoogleCallback(code);
}