import { NextRequest } from 'next/server';
import { resendVerification } from '@/controllers/authController';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  return resendVerification(email);
}