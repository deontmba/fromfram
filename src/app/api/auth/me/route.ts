import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getMe } from '@/controllers/authController';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return getMe(payload.id as string);
  } catch (error) {
    console.error('[ME ERROR]', error);
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }
}