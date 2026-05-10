import { NextRequest } from 'next/server';
import { register } from '@/controllers/authController';
import { validate } from '@/lib/validate';
import { registerSchema } from '@/schemas';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = validate(registerSchema, body);
  if (!parsed.success) return parsed.response;

  return register(parsed.data.name, parsed.data.email, parsed.data.password);
}