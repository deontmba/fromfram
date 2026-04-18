import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import prisma from '@/lib/prisma';

const DAYS_OF_WEEK = [
  'SENIN',
  'SELASA',
  'RABU',
  'KAMIS',
  'JUMAT',
  'SABTU',
  'MINGGU',
] as const;

type DayKey = (typeof DAYS_OF_WEEK)[number];

/**
 * Returns the Monday of NEXT week (relative to now, Jakarta time).
 * The frontend onboarding flow is selecting meals for the upcoming week.
 */
function getNextMonday(): Date {
  // Use Jakarta timezone offset (UTC+7)
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })
  );
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  const daysUntilNextMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilNextMonday);
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday;
}

/**
 * GET /api/subscriptions/weekly-menu
 *
 * Returns the weekly menu for NEXT week, grouped by day (SENIN–MINGGU).
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
 * NOTE: The WeeklyMenu table stores recipes per week (not per day). All recipes
 * available that week are returned on EVERY day so the user can pick one per day.
 * This matches the frontend's UX — same catalog shown regardless of which day tab
 * the user is on.
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
    const weekStart = getNextMonday();

    // Fetch all recipes available for next week from WeeklyMenu table
    const weeklyMenus = await prisma.weeklyMenu.findMany({
      where: { weekStartDate: weekStart },
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

    // Shape the recipes into the flat list the day-tabs will share
    const recipes = weeklyMenus.map((wm) => ({
      id: wm.recipe.id,
      name: wm.recipe.name,
      description: wm.recipe.description ?? undefined,
      calories: wm.recipe.calories,
      protein: wm.recipe.protein,
      servings: wm.recipe.servings,
      imageUrl: wm.recipe.imageUrl ?? undefined,
    }));

    // Build one entry per day — same recipe catalog on every day
    const weekEndDate = new Date(weekStart);
    weekEndDate.setDate(weekStart.getDate() + 6); // Sunday

    const menu = DAYS_OF_WEEK.map((day, idx) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + idx);
      return {
        day,
        date: date.toISOString(),
        recipes,
      };
    });

    return NextResponse.json({
      weekStartDate: weekStart.toISOString(),
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

    const weekStart = new Date(weekStartDate);
    if (isNaN(weekStart.getTime())) {
      return NextResponse.json(
        { error: 'Invalid weekStartDate format.' },
        { status: 400 }
      );
    }

    const userId = session.userId;

    // Find the user's current WeeklyBox for this week
    const weeklyBox = await prisma.weeklyBox.findFirst({
      where: {
        userId,
        weekStartDate: weekStart,
        status: 'PENDING_SELECTION',
      },
    });

    if (!weeklyBox) {
      return NextResponse.json(
        {
          error:
            'No active WeeklyBox found for this week. Make sure your subscription is active.',
        },
        { status: 404 }
      );
    }

    // Upsert a MealSelection record for each day
    // Using upsert so re-submitting the form doesn't create duplicates
    const upsertOps = mealSelections.map(({ day, recipeId }) =>
      prisma.mealSelection.upsert({
        where: {
          // Composite unique key: weeklyBoxId + dayOfWeek
          weeklyBoxId_dayOfWeek: {
            weeklyBoxId: weeklyBox.id,
            dayOfWeek: day,
          },
        },
        update: { recipeId },
        create: {
          weeklyBoxId: weeklyBox.id,
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