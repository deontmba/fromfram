import { NextRequest } from 'next/server';
import { forgotPassword } from '@/controllers/authController';
import { validate } from '@/lib/validate';
import { forgotPasswordSchema } from '@/schemas';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = validate(forgotPasswordSchema, body);
  if (!parsed.success) return parsed.response;

  return forgotPassword(parsed.data.email);
}