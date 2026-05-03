import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import prisma from '@/lib/prisma';
import { DayOfWeek } from '@prisma/client';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') {
    return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  }
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

/**
 * API Documentation
 * Endpoint   : POST /api/v1/meal-selections
 * Deskripsi  : Menyimpan pilihan menu harian user untuk minggu tertentu.
 * Method     : POST
 * Auth       : Cookie `token`
 * Body       :
 * {
 *   "weeklyBoxId": "clx...",
 *   "selections": [
 *     { "dayOfWeek": "SENIN", "recipeId": "clx..." },
 *     { "dayOfWeek": "SELASA", "recipeId": "clx..." },
 *     ...
 *   ]
 * }
 */
export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  try {
    const body = await req.json();
    const { weeklyBoxId, selections } = body as {
      weeklyBoxId: string;
      selections: { dayOfWeek: DayOfWeek; recipeId: string }[];
    };

    if (!weeklyBoxId || !Array.isArray(selections) || selections.length === 0) {
      return NextResponse.json(
        { error: 'weeklyBoxId dan selections wajib diisi.' },
        { status: 400 }
      );
    }

    const box = await prisma.weeklyBox.findUnique({
      where: { id: weeklyBoxId },
    });

    if (!box) {
      return NextResponse.json({ error: 'Weekly box tidak ditemukan.' }, { status: 404 });
    }

    if (box.userId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    if (box.status !== 'PENDING_SELECTION') {
      return NextResponse.json(
        { error: `Tidak bisa mengubah pilihan menu untuk box dengan status "${box.status}".` },
        { status: 400 }
      );
    }

    const now = new Date();
    if (now > box.selectionDeadline) {
      return NextResponse.json(
        { error: 'Batas waktu pemilihan menu sudah lewat.' },
        { status: 400 }
      );
    }

    // Validate all recipes are in this week's menu
    const weeklyMenuRecipes = await prisma.weeklyMenu.findMany({
      where: { weekStartDate: box.weekStartDate },
      select: { recipeId: true },
    });
    const availableRecipeIds = new Set(weeklyMenuRecipes.map((wm) => wm.recipeId));

    for (const sel of selections) {
      if (!availableRecipeIds.has(sel.recipeId)) {
        return NextResponse.json(
          { error: `Resep ${sel.recipeId} tidak tersedia di menu minggu ini.` },
          { status: 400 }
        );
      }
    }

    // Upsert — one recipe per day per box (enforced by @@unique in schema)
    const upserts = selections.map((sel) =>
      prisma.mealSelection.upsert({
        where: {
          weeklyBoxId_dayOfWeek: {
            weeklyBoxId,
            dayOfWeek: sel.dayOfWeek,
          },
        },
        update: { recipeId: sel.recipeId },
        create: {
          weeklyBoxId,
          recipeId: sel.recipeId,
          dayOfWeek: sel.dayOfWeek,
        },
      })
    );

    const results = await prisma.$transaction(upserts);

    return NextResponse.json(
      { message: 'Pilihan menu berhasil disimpan.', count: results.length, data: results },
      { status: 201 }
    );
  } catch (error) {
    console.error('[MEAL SELECTION POST ERROR]', error);
    return NextResponse.json({ error: 'Gagal menyimpan pilihan menu.' }, { status: 500 });
  }
}