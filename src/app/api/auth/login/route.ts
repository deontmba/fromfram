import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/controllers/authController';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    return await login(email, password);
  } catch (error) {
    console.error("[LOGIN ROUTE ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}