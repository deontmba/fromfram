import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { NextResponse } from 'next/server';

interface TokenPayload extends JWTPayload {
  id: string;
  email: string;
  role: string;
}

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
};

export async function createJwtToken(userId: string, email: string, role: string) {
  return new SignJWT({ id: userId, email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

export async function verifyJwtToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret());
  return payload as TokenPayload;
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return response;
}