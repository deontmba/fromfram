import prisma from '@/lib/prisma';
import * as bcrypt from 'bcrypt';
import { SignJWT } from 'jose';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import * as crypto from 'crypto';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy');
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

// ============================================================
// HELPERS
// ============================================================



async function createJwtToken(userId: string, email: string, role: string) {
  return new SignJWT({ id: userId, email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return response;
}



// ============================================================
// REGISTER
// ============================================================

export const register = async (name: string, email: string, password: string) => {
  try {
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required.' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use.' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Buat user baru dengan isVerified: true (langsung aktif)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    return NextResponse.json(
      {
        message: 'Registrasi berhasil. Silakan login.',
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[REGISTER ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
};

// ============================================================
// LOGIN
// ============================================================

export const login = async (email: string, password: string) => {
  try {
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Invalid credentials.' },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid credentials.' },
        { status: 401 }
      );
    }

    // Email verification check removed as requested

    const token = await createJwtToken(user.id, user.email, user.role);

    const response = NextResponse.json(
      {
        message: 'Login successful.',
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
      { status: 200 }
    );

    return setAuthCookie(response, token);
  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
};


// ============================================================
// GOOGLE SSO — Generate Auth URL
// ============================================================

export const getGoogleAuthUrl = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

// ============================================================
// GOOGLE SSO — Handle Callback
// ============================================================

export const handleGoogleCallback = async (code: string) => {
  try {
    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code diperlukan.' },
        { status: 400 }
      );
    }

    // 1. Tukar code dengan access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('[GOOGLE TOKEN ERROR]', tokenData);
      return NextResponse.redirect(`${BASE_URL}/login?error=google_failed`);
    }

    // 2. Ambil data user dari Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userInfoResponse.json();

    if (!googleUser.email) {
      return NextResponse.redirect(`${BASE_URL}/login?error=google_no_email`);
    }

    // 3. Cari atau buat user di database
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: googleUser.sub },
          { email: googleUser.email },
        ],
      },
    });

    if (!user) {
      // Buat user baru dari Google (langsung verified)
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name ?? googleUser.email,
          googleId: googleUser.sub,
          avatarUrl: googleUser.picture ?? null,
          isVerified: true, // Google sudah verifikasi email
          password: null,   // SSO user tidak punya password
        },
      });
    } else if (!user.googleId) {
      // User sudah ada via email/password, link ke Google
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleUser.sub,
          avatarUrl: googleUser.picture ?? null,
          isVerified: true,
        },
      });
    }

    // 4. Buat JWT dan set cookie
    const jwtToken = await createJwtToken(user.id, user.email, user.role);

    const response = NextResponse.redirect(`${BASE_URL}/dashboard`);
    return setAuthCookie(response, jwtToken);
  } catch (error) {
    console.error('[GOOGLE CALLBACK ERROR]', error);
    return NextResponse.redirect(`${BASE_URL}/login?error=server_error`);
  }
};