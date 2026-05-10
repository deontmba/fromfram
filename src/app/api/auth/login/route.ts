import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/controllers/authController';
import { validate } from '@/lib/validate';
import { loginSchema } from '@/schemas';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = validate(loginSchema, body);
  if (!parsed.success) return parsed.response;

  return login(parsed.data.email, parsed.data.password);
}