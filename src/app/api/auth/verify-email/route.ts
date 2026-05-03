import { NextRequest } from 'next/server';
import { verifyEmail } from '@/controllers/authController';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token') ?? '';
  return verifyEmail(token);
}