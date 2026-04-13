import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import prisma from '@/lib/prisma';

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
 * Endpoint   : GET /api/profile/health
 * Deskripsi  : Mengambil data health profile (nutritional profile) user yang sedang login.
 * Method     : GET
 * Auth       : Cookie `token`
 * Response   :
 * {
 *   "profile": {
 *     "weight": 70,
 *     "height": 175,
 *     "dailyCalorieNeed": 2200,
 *     "allergies": "Tidak ada",
 *     "medicalNotes": "Latihan 4x seminggu"
 *   }
 * }
 */
export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  try {
    const nutritionalProfile = await prisma.nutritionalProfile.findUnique({
      where: { userId: session.userId },
      select: {
        weight: true,
        height: true,
        dailyCalorieNeed: true,
        allergies: true,
        medicalNotes: true,
      },
    });

    // Kembalikan null-safe profile (frontend sudah handle fallback ke mock data)
    return NextResponse.json({
      profile: nutritionalProfile ?? null,
    });
  } catch (error) {
    console.error('[HEALTH GET ERROR]', error);
    return NextResponse.json(
      { error: 'Gagal mengambil health profile.' },
      { status: 500 }
    );
  }
}

/**
 * API Documentation
 * Endpoint   : PUT /api/profile/health
 * Deskripsi  : Memperbarui health profile (nutritional profile) user yang sedang login.
 *              Menggunakan upsert — jika belum ada akan dibuat, jika sudah ada akan diupdate.
 * Method     : PUT
 * Auth       : Cookie `token`
 * Body       :
 * {
 *   "weight": 70,          // wajib, number
 *   "height": 175,         // wajib, number
 *   "allergies": "...",    // opsional, string
 *   "medicalNotes": "..."  // opsional, string
 * }
 * Response   :
 * {
 *   "profile": { ... }
 * }
 */
export async function PUT(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  try {
    const body = await req.json();

    const weight = Number(body.weight);
    const height = Number(body.height);

    // Validasi weight dan height wajib ada dan berupa angka valid
    if (!Number.isFinite(weight) || weight <= 0) {
      return NextResponse.json(
        { error: 'Berat badan (weight) harus berupa angka positif.' },
        { status: 400 }
      );
    }
    if (!Number.isFinite(height) || height <= 0) {
      return NextResponse.json(
        { error: 'Tinggi badan (height) harus berupa angka positif.' },
        { status: 400 }
      );
    }

    // Hitung dailyCalorieNeed otomatis jika tidak dikirim frontend
    // Menggunakan rumus Harris-Benedict sederhana (estimasi, bisa disesuaikan)
    // Frontend health-profile-screen tidak mengirim dailyCalorieNeed,
    // jadi kita hitung atau pertahankan nilai lama
    const existingProfile = await prisma.nutritionalProfile.findUnique({
      where: { userId: session.userId },
      select: { dailyCalorieNeed: true },
    });

    const dailyCalorieNeed =
      Number.isFinite(Number(body.dailyCalorieNeed)) && Number(body.dailyCalorieNeed) > 0
        ? Number(body.dailyCalorieNeed)
        : (existingProfile?.dailyCalorieNeed ?? Math.round(10 * weight + 6.25 * height - 5 * 25 + 5));
    // Rumus di atas: Mifflin-St Jeor untuk pria usia 25 sebagai default fallback

    const allergies = typeof body.allergies === 'string' ? body.allergies : null;
    const medicalNotes = typeof body.medicalNotes === 'string' ? body.medicalNotes : null;

    const updatedProfile = await prisma.nutritionalProfile.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        weight,
        height,
        dailyCalorieNeed,
        allergies,
        medicalNotes,
      },
      update: {
        weight,
        height,
        dailyCalorieNeed,
        allergies,
        medicalNotes,
      },
      select: {
        weight: true,
        height: true,
        dailyCalorieNeed: true,
        allergies: true,
        medicalNotes: true,
      },
    });

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error('[HEALTH PUT ERROR]', error);
    return NextResponse.json(
      { error: 'Gagal menyimpan health profile.' },
      { status: 500 }
    );
  }
}