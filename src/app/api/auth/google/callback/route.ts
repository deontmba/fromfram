import { NextRequest } from 'next/server';
import { handleGoogleCallback } from '@/controllers/authController';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code') ?? '';
  return handleGoogleCallback(code);
}