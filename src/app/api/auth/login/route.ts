import { NextRequest } from 'next/server';
import { login } from '@/controllers/authController';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  return login(email, password);
}