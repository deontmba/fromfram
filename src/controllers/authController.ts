import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import crypto from 'crypto';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const resend = new Resend(process.env.RESEND_API_KEY!);
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

// ============================================================
// HELPERS
// ============================================================

function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function createJwtToken(userId: string, email: string) {
  return new SignJWT({ id: userId, email })
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

async function sendVerificationEmail(email: string, name: string, token: string) {
  const verifyUrl = `${BASE_URL}/api/auth/verify-email?token=${token}`;

  await resend.emails.send({
    from: 'FromFram <onboarding@resend.dev>',
    to: email,
    subject: 'Verifikasi Email Akun FromFram Kamu',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #12b886;">Halo, ${name}! 👋</h2>
        <p>Terima kasih sudah mendaftar di <strong>FromFram</strong>.</p>
        <p>Klik tombol di bawah untuk memverifikasi email kamu:</p>
        <a
          href="${verifyUrl}"
          style="
            display: inline-block;
            margin: 16px 0;
            padding: 12px 24px;
            background-color: #12b886;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
          "
        >
          Verifikasi Email
        </a>
        <p style="color: #888; font-size: 13px;">
          Link ini berlaku selama <strong>24 jam</strong>. Jika kamu tidak mendaftar di FromFram, abaikan email ini.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px;">FromFram — Meal Kit Sehat untuk Keluarga Indonesia</p>
      </div>
    `,
  });
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

    // Buat user baru dengan isVerified: false
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isVerified: false,
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    // Buat verification token (berlaku 24 jam)
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    // Kirim email verifikasi via Resend
    await sendVerificationEmail(email, name, token);

    return NextResponse.json(
      {
        message: 'Registrasi berhasil. Cek email kamu untuk verifikasi akun.',
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

    // Cek apakah email sudah diverifikasi
    if (!user.isVerified) {
      return NextResponse.json(
        {
          error: 'Email belum diverifikasi. Cek inbox email kamu.',
          code: 'EMAIL_NOT_VERIFIED',
        },
        { status: 403 }
      );
    }

    const token = await createJwtToken(user.id, user.email);

    const response = NextResponse.json(
      {
        message: 'Login successful.',
        user: { id: user.id, name: user.name, email: user.email },
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
// VERIFY EMAIL
// ============================================================

export const verifyEmail = async (token: string) => {
  try {
    if (!token) {
      return NextResponse.json(
        { error: 'Token verifikasi diperlukan.' },
        { status: 400 }
      );
    }

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Token tidak valid atau sudah digunakan.' },
        { status: 400 }
      );
    }

    // Cek apakah token sudah expired
    if (verificationToken.expiresAt < new Date()) {
      await prisma.verificationToken.delete({ where: { token } });
      return NextResponse.json(
        { error: 'Token verifikasi sudah expired. Minta kirim ulang email verifikasi.' },
        { status: 400 }
      );
    }

    // Cek apakah sudah terverifikasi
    if (verificationToken.user.isVerified) {
      await prisma.verificationToken.delete({ where: { token } });
      return NextResponse.redirect(`${BASE_URL}/login?verified=already`);
    }

    // Update user isVerified = true & hapus token
    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { isVerified: true },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ]);

    // Redirect ke login dengan pesan sukses
    return NextResponse.redirect(`${BASE_URL}/login?verified=success`);
  } catch (error) {
    console.error('[VERIFY EMAIL ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
};

// ============================================================
// RESEND VERIFICATION EMAIL
// ============================================================

export const resendVerification = async (email: string) => {
  try {
    if (!email) {
      return NextResponse.json(
        { error: 'Email diperlukan.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Selalu return sukses meskipun email tidak ditemukan (security)
    if (!user || user.isVerified) {
      return NextResponse.json({
        message: 'Jika email terdaftar dan belum diverifikasi, email verifikasi akan dikirim.',
      });
    }

    // Hapus token lama jika ada
    await prisma.verificationToken.deleteMany({ where: { userId: user.id } });

    // Buat token baru
    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    await sendVerificationEmail(email, user.name, token);

    return NextResponse.json({
      message: 'Jika email terdaftar dan belum diverifikasi, email verifikasi akan dikirim.',
    });
  } catch (error) {
    console.error('[RESEND VERIFICATION ERROR]', error);
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
    const jwtToken = await createJwtToken(user.id, user.email);

    const response = NextResponse.redirect(`${BASE_URL}/dashboard`);
    return setAuthCookie(response, jwtToken);
  } catch (error) {
    console.error('[GOOGLE CALLBACK ERROR]', error);
    return NextResponse.redirect(`${BASE_URL}/login?error=server_error`);
  }
};