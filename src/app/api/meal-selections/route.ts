import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { saveMealSelection } from '@/controllers/mealSelectionController';
import { validate } from '@/lib/validate';
import { saveMealSelectionSchema } from '@/schemas';
import prisma from '@/lib/prisma';
import { DayOfWeek } from '@prisma/client';

export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const body = await req.json();
    const parsed = validate(saveMealSelectionSchema, body);
    if (!parsed.success) return parsed.response;
    const { weeklyBoxId, selections } = body as {
      weeklyBoxId: string;
      selections: { dayOfWeek: DayOfWeek; mealType?: 'LUNCH' | 'DINNER'; serving?: number; recipeId: string }[];
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

    // Upsert — one recipe per day per mealType per box (enforced by @@unique in schema)
    const upserts = selections.map((sel) =>
      prisma.mealSelection.upsert({
        where: {
          weeklyBoxId_dayOfWeek_mealType_recipeId: {
            weeklyBoxId,
            dayOfWeek: sel.dayOfWeek,
            mealType: sel.mealType ?? 'LUNCH',
            recipeId: sel.recipeId,
          },
        },
        update: { serving: sel.serving ?? 1 },
        create: {
          weeklyBoxId,
          recipeId: sel.recipeId,
          dayOfWeek: sel.dayOfWeek,
          mealType: sel.mealType ?? 'LUNCH',
          serving: sel.serving ?? 1,
        },
      })
    );

    const results = await prisma.$transaction(upserts);

    const result = await saveMealSelection(session.userId, parsed.data);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[MEAL SELECTION POST ERROR]', error);
    return NextResponse.json({ error: 'Gagal menyimpan pilihan menu.' }, { status: 500 });
  }
}