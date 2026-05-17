import { NextRequest } from 'next/server';
import { resetPassword } from '@/controllers/authController';
import { validate } from '@/lib/validate';
import { resetPasswordSchema } from '@/schemas';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = validate(resetPasswordSchema, body);
  if (!parsed.success) return parsed.response;

  return resetPassword(parsed.data.token, parsed.data.newPassword);
}