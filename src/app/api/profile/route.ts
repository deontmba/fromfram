import { NextRequest, NextResponse } from 'next/server';
import { getProfile, updateProfile } from '@/controllers/profileController';
import { getSessionUserId } from '@/lib/session';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') {
    return NextResponse.json(
      { error: 'Server auth configuration missing.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

/**
 * API Documentation
 * Endpoint   : GET /api/profile
 * Deskripsi  : Mengambil profil user yang sedang login.
 * Method     : GET
 * Input      : Cookie `token` dari sesi login.
 * Proses     :
 * 1) Validasi sesi user dari cookie JWT.
 * 2) Panggil controller `getProfile`.
 * 3) Kembalikan data profil user.
 */

export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if (!('userId' in session)) {
    return getAuthErrorResponse(session.error);
  }
  return getProfile(req, session.userId);
}

/**
 * API Documentation
 * Endpoint   : PUT /api/profile
 * Deskripsi  : Memperbarui data profil user yang sedang login.
 * Method     : PUT
 * Input      : JSON body untuk data profil (contoh: name, weight, height, dailyCalorieNeed, allergies).
 * Proses     :
 * 1) Validasi sesi user dari cookie JWT.
 * 2) Panggil controller `updateProfile`.
 * 3) Simpan perubahan profil + nutritional profile melalui Prisma.
 */

export async function PUT(req: NextRequest) {
  const session = await getSessionUserId(req);
  if (!('userId' in session)) {
    return getAuthErrorResponse(session.error);
  }

  return updateProfile(req, session.userId);
}
