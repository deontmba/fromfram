import { NextRequest } from 'next/server';
import { register } from '@/controllers/authController';

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();
  return register(name, email, password);
}