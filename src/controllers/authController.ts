import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import * as crypto from 'crypto';
import { createJwtToken, setAuthCookie } from '@/lib/jwt';      
import { hashPassword, verifyPassword } from '@/lib/hash';      
import { sendPasswordResetEmail } from '@/lib/email';           

export const register = async (name: string, email: string, password: string) => {
  try {
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use.' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);  

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    return NextResponse.json(
      { message: 'Registrasi berhasil. Silakan login.', user },
      { status: 201 }
    );
  } catch (error) {
    console.error('[REGISTER ERROR]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
};

export const login = async (email: string, password: string) => {
  try {
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const passwordMatch = await verifyPassword(password, user.password); 
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const token = await createJwtToken(user.id, user.email, user.role); 

    const response = NextResponse.json(
      { message: 'Login successful.', user: { id: user.id, name: user.name, email: user.email, role: user.role, hasCompletedOnboarding: user.hasCompletedOnboarding } },
      { status: 200 }
    );

    return setAuthCookie(response, token); 
  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
};

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

export const handleGoogleCallback = async (code: string) => {
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

  try {
    if (!code) {
      return NextResponse.json({ error: 'Authorization code diperlukan.' }, { status: 400 });
    }

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

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userInfoResponse.json();
    if (!googleUser.email) {
      return NextResponse.redirect(`${BASE_URL}/login?error=google_no_email`);
    }

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: googleUser.sub }, { email: googleUser.email }] },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name ?? googleUser.email,
          googleId: googleUser.sub,
          avatarUrl: googleUser.picture ?? null,
          isVerified: true,
          password: null,
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: googleUser.sub, avatarUrl: googleUser.picture ?? null, isVerified: true },
      });
    }

    const jwtToken = await createJwtToken(user.id, user.email, user.role); 
    const redirectUrl = user.hasCompletedOnboarding ? `${BASE_URL}/dashboard` : `${BASE_URL}/onboarding`;
    const response = NextResponse.redirect(redirectUrl);
    return setAuthCookie(response, jwtToken);
  } catch (error) {
    console.error('[GOOGLE CALLBACK ERROR]', error);
    return NextResponse.redirect(`${BASE_URL}/login?error=server_error`);
  }
};

export const getMe = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true, hasCompletedOnboarding: true },
    });

    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('[ME ERROR]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
};

export const forgotPassword = async (email: string) => {
  try {
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ message: 'Jika email terdaftar, link reset telah dikirim.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    await sendPasswordResetEmail(email, token); 

    return NextResponse.json({ message: 'Jika email terdaftar, link reset telah dikirim.' });
  } catch (error) {
    console.error('[FORGOT PASSWORD ERROR]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
};

export const resetPassword = async (token: string, newPassword: string) => {
  try {
    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and new password are required.' }, { status: 400 });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken) {
      return NextResponse.json({ error: 'Token reset password tidak valid.' }, { status: 400 });
    }

    if (resetToken.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { token } });
      return NextResponse.json({ error: 'Token reset password sudah kadaluarsa.' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    await prisma.passwordResetToken.deleteMany({ where: { userId: resetToken.userId } });

    return NextResponse.json({ message: 'Password berhasil direset.' });
  } catch (error) {
    console.error('[RESET PASSWORD ERROR]', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
};