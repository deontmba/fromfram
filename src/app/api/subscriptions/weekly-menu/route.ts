import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import prisma from '@/lib/prisma';
import { DAYS_OF_WEEK, DayKey, getEndOfWeek, getNextWeekStart, getStartOfWeek } from '@/lib/week';

function buildWeeklyBoxDates(weekStart: Date) {
  const weekEndDate = getEndOfWeek(weekStart);

  const selectionDeadline = new Date(weekStart);
  selectionDeadline.setDate(selectionDeadline.getDate() - 1);
  selectionDeadline.setHours(18, 0, 0, 0);

  return {
    weekEndDate,
    selectionDeadline,
  };
}


/**
 * GET /api/subscriptions/weekly-menu
 *
 * Returns the weekly menu for the active calendar week, grouped by day (SENIN–MINGGU).
 * Shape expected by the frontend WeeklyMenuPage:
 * {
 *   weekStartDate: string,   // ISO date string
 *   weekEndDate:   string,
 *   menu: Array<{
 *     day:     DayKey,
 *     date:    string,       // ISO date string for that specific day
 *     recipes: Recipe[],
 *   }>
 * }
 *
 * NOTE: The WeeklyMenu table stores menu entries as one row per recipe. We group
 * rows by the active calendar week and expose the same recipe catalog on every
 * day so the user can pick one recipe per day.
 */
export async function GET(req: NextRequest) {
  // Auth check — keep consistent with the rest of the codebase.
  // If the page can be reached before login (onboarding flow), you can remove this block.
  const session = await getSessionUserId(req);
  if ('error' in session) {
    // Treat CONFIG_MISSING as 500, anything else as 401
    const status = session.error === 'CONFIG_MISSING' ? 500 : 401;
    return NextResponse.json({ error: 'Not authenticated.' }, { status });
  }

  try {
    const currentWeekStart = getStartOfWeek(new Date());
    const nextWeekStart = getNextWeekStart(currentWeekStart);

    const weeklyMenus = await prisma.weeklyMenu.findMany({
      where: {
        weekStartDate: {
          gte: currentWeekStart,
          lt: nextWeekStart,
        },
      },
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
            description: true,
            calories: true,
            protein: true,
            servings: true,
            imageUrl: true,
          },
        },
      },
    });

    if (weeklyMenus.length === 0) {
      return NextResponse.json(
        { error: 'Ahli gizi kamu belum menyiapkan menu untuk minggu ini.' },
        { status: 404 }
      );
    }

    const recipes = Array.from(
      new Map(
        weeklyMenus.map((wm) => [wm.recipe.id, {
          id: wm.recipe.id,
          name: wm.recipe.name,
          description: wm.recipe.description ?? undefined,
          calories: wm.recipe.calories,
          protein: wm.recipe.protein,
          servings: wm.recipe.servings,
          imageUrl: wm.recipe.imageUrl ?? undefined,
        }])
      ).values()
    );

    // Build one entry per day — same recipe catalog on every day
      const weekEndDate = getEndOfWeek(currentWeekStart);

    const menu = DAYS_OF_WEEK.map((day, idx) => {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + idx);
      return {
        day,
        date: date.toISOString(),
        recipes,
      };
    });

    return NextResponse.json({
      weekStartDate: currentWeekStart.toISOString(),
      weekEndDate: weekEndDate.toISOString(),
      menu,
    });
  } catch (error) {
    console.error('[GET /api/subscriptions/weekly-menu]', error);
    return NextResponse.json(
      { error: 'Gagal mengambil weekly menu.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/subscriptions/weekly-menu
 *
 * Saves the user's meal selections for the week.
 * Body: {
 *   mealSelections: Array<{ day: DayKey; recipeId: string }>,
 *   weekStartDate:  string | Date,
 * }
 */
export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    const status = session.error === 'CONFIG_MISSING' ? 500 : 401;
    return NextResponse.json({ error: 'Not authenticated.' }, { status });
  }

  try {
    const body = (await req.json()) as {
      mealSelections: Array<{ day: DayKey; recipeId: string }>;
      weekStartDate: string | Date;
    };

    const { mealSelections, weekStartDate } = body;

    if (!mealSelections?.length || !weekStartDate) {
      return NextResponse.json(
        { error: 'mealSelections and weekStartDate are required.' },
        { status: 400 }
      );
    }

    const requestedWeekStart = new Date(weekStartDate);
    if (isNaN(requestedWeekStart.getTime())) {
      return NextResponse.json(
        { error: 'Invalid weekStartDate format.' },
        { status: 400 }
      );
    }

    const weekStart = getStartOfWeek(requestedWeekStart);
    const nextWeekStart = getNextWeekStart(weekStart);

    const userId = session.userId;

    const weeklyMenuRecipes = await prisma.weeklyMenu.findMany({
      where: {
        weekStartDate: {
          gte: weekStart,
          lt: nextWeekStart,
        },
      },
      select: { recipeId: true },
    });
    const availableRecipeIds = new Set(weeklyMenuRecipes.map((menu) => menu.recipeId));

    if (availableRecipeIds.size === 0) {
      return NextResponse.json(
        { error: 'Weekly menu belum tersedia untuk minggu ini.' },
        { status: 404 }
      );
    }

    for (const selection of mealSelections) {
      if (!availableRecipeIds.has(selection.recipeId)) {
        return NextResponse.json(
          {
            error: `Resep ${selection.recipeId} tidak tersedia di weekly menu minggu ini.`,
          },
          { status: 400 }
        );
      }
    }

    const existingWeeklyBox = await prisma.weeklyBox.findFirst({
      where: {
        userId,
        weekStartDate: {
          gte: weekStart,
          lt: nextWeekStart,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    let weeklyBoxId = existingWeeklyBox?.id;

    if (existingWeeklyBox && existingWeeklyBox.status !== 'PENDING_SELECTION') {
      return NextResponse.json(
        {
          error: `WeeklyBox untuk minggu ini sudah berstatus ${existingWeeklyBox.status}. Pilihan menu tidak bisa diubah.`,
        },
        { status: 400 }
      );
    }

    if (!weeklyBoxId) {
      const subscription = await prisma.subscription.findFirst({
        where: { userId },
        select: {
          id: true,
          status: true,
          pausedUntil: true,
        },
      });

      if (!subscription) {
        return NextResponse.json(
          { error: 'Subscription tidak ditemukan. Silakan pilih plan terlebih dahulu.' },
          { status: 404 }
        );
      }

      if (subscription.status === 'CANCELLED') {
        return NextResponse.json(
          { error: 'Subscription kamu sudah CANCELLED. Aktifkan subscription untuk memilih menu.' },
          { status: 400 }
        );
      }

      if (subscription.status === 'PAUSED') {
        const pausedUntil = subscription.pausedUntil ? new Date(subscription.pausedUntil) : null;
        if (!pausedUntil || pausedUntil >= weekStart) {
          return NextResponse.json(
            { error: 'Subscription sedang PAUSED untuk minggu ini, sehingga belum bisa pilih menu.' },
            { status: 400 }
          );
        }
      }

      const { weekEndDate, selectionDeadline } = buildWeeklyBoxDates(weekStart);

      const createdWeeklyBox = await prisma.weeklyBox.create({
        data: {
          userId,
          weekStartDate: weekStart,
          weekEndDate,
          selectionDeadline,
          status: 'PENDING_SELECTION',
          isAutoSelected: false,
        },
        select: {
          id: true,
        },
      });

      weeklyBoxId = createdWeeklyBox.id;
    }

    if (!weeklyBoxId) {
      return NextResponse.json(
        { error: 'WeeklyBox gagal dipersiapkan untuk penyimpanan menu.' },
        { status: 500 }
      );
    }

    // Upsert a MealSelection record for each day
    // Using upsert so re-submitting the form doesn't create duplicates
    const upsertOps = mealSelections.map(({ day, recipeId }) =>
      prisma.mealSelection.upsert({
        where: {
          // Composite unique key: weeklyBoxId + dayOfWeek
          weeklyBoxId_dayOfWeek: {
            weeklyBoxId,
            dayOfWeek: day,
          },
        },
        update: { recipeId },
        create: {
          weeklyBoxId,
          recipeId,
          dayOfWeek: day,
        },
      })
    );

    await prisma.$transaction(upsertOps);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/subscriptions/weekly-menu]', error);
    return NextResponse.json(
      { error: 'Gagal menyimpan meal selections.' },
      { status: 500 }
    );
  }
}