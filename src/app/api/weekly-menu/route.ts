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
 * Endpoint   : POST /api/v1/weekly-menu
 * Deskripsi  : Mengatur daftar resep untuk minggu tertentu. Minimal 7 resep.
 * Method     : POST
 * Auth       : Cookie `token` — Role: NUTRITIONIST
 * Body       :
 * {
 *   "weekStartDate": "2026-04-14",
 *   "recipeIds": ["clx...", "clx...", ...] // minimal 7
 * }
 */
export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!user || user.role !== 'NUTRITIONIST') {
      return NextResponse.json(
        { error: 'Forbidden. Only nutritionists can set weekly menus.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { weekStartDate, recipeIds } = body as {
      weekStartDate: string;
      recipeIds: string[];
    };

    if (!weekStartDate || !Array.isArray(recipeIds) || recipeIds.length < 7) {
      return NextResponse.json(
        { error: 'weekStartDate and at least 7 recipeIds are required.' },
        { status: 400 }
      );
    }

    const weekStart = new Date(weekStartDate);
    if (isNaN(weekStart.getTime())) {
      return NextResponse.json(
        { error: 'Invalid weekStartDate format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    const recipes = await prisma.recipe.findMany({
      where: { id: { in: recipeIds } },
      select: { id: true },
    });

    if (recipes.length !== recipeIds.length) {
      return NextResponse.json(
        { error: 'One or more recipeIds are invalid.' },
        { status: 400 }
      );
    }

    const upserts = recipeIds.map((recipeId) =>
      prisma.weeklyMenu.upsert({
        where: { recipeId_weekStartDate: { recipeId, weekStartDate: weekStart } },
        update: {},
        create: { recipeId, weekStartDate: weekStart },
      })
    );

    const results = await prisma.$transaction(upserts);

    return NextResponse.json(
      { message: 'Weekly menu set successfully.', weekStartDate: weekStart, count: results.length },
      { status: 201 }
    );
  } catch (error) {
    console.error('[WEEKLY MENU POST ERROR]', error);
    return NextResponse.json({ error: 'Gagal menyimpan weekly menu.' }, { status: 500 });
  }
}