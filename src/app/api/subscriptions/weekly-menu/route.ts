import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { getWeeklyMenu, saveWeeklyMenuSelections } from '@/controllers/subscriptionController';
import { validate } from '@/lib/validate';
import { saveMealSelectionsSchema } from '@/schemas';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING')
    return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const result = await getWeeklyMenu();
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[SUBSCRIPTION WEEKLY MENU GET ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil weekly menu.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const body = (await req.json()) as {
      mealSelections: Array<{ day: DayKey; mealType: 'LUNCH' | 'DINNER'; serving?: number; recipeId: string }>;
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
      if (selection.mealType !== 'LUNCH' && selection.mealType !== 'DINNER') {
        return NextResponse.json(
          { error: `mealType harus LUNCH atau DINNER.` },
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

    // Group selections by (day, mealType) for efficient delete+recreate
    const dayMealKeys = [...new Set(
      mealSelections.map(({ day, mealType }) => `${day}:${mealType}`)
    )];

    await prisma.$transaction(async (tx) => {
      // Delete existing selections for each (day, mealType) being submitted
      for (const key of dayMealKeys) {
        const [day, mealType] = key.split(':') as [string, string];
        await tx.mealSelection.deleteMany({
          where: { weeklyBoxId, dayOfWeek: day as never, mealType: mealType as never },
        });
      }

      // Create all new selections with serving counts
      await tx.mealSelection.createMany({
        data: mealSelections.map(({ day, mealType, recipeId, serving }) => ({
          weeklyBoxId,
          recipeId,
          dayOfWeek: day,
          mealType,
          serving: serving ?? 1,
        })),
      });
    });

    const result = await saveWeeklyMenuSelections(session.userId, parsed.data);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[SUBSCRIPTION WEEKLY MENU POST ERROR]', error);
    return NextResponse.json({ error: 'Gagal menyimpan meal selections.' }, { status: 500 });
  }
}