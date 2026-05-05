import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import prisma from '@/lib/prisma';
import { getEndOfWeek, getStartOfWeek } from '@/lib/week';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  const requestingUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });

  if (!requestingUser || requestingUser.role !== 'NUTRITIONIST') {
    return NextResponse.json({ error: 'Forbidden. Nutritionist access required.' }, { status: 403 });
  }

  try {
    const weeklyMenus = await prisma.weeklyMenu.findMany({
      include: {
        recipe: true
      },
      orderBy: {
        weekStartDate: 'desc'
      }
    });

    const goals = await prisma.goal.findMany({
      orderBy: { name: 'asc' },
    });
    const goalOptions = goals.map((goal) => ({
      id: goal.id,
      name: goal.name,
    }));

    const currentWeekStart = getStartOfWeek(new Date());
    const groupedMenus = new Map<string, {
      weekStartDate: Date;
      menus: Array<{
        id: string;
        recipeName: string;
        calories: number;
        protein: number;
        suitableGoals: string[];
      }>;
    }>();

    for (const menu of weeklyMenus) {
      const weekStartDate = getStartOfWeek(menu.weekStartDate);
      const key = weekStartDate.toISOString();
      const suitableGoals = goals.filter((goal) =>
        menu.recipe.calories >= goal.minCalories &&
        menu.recipe.calories <= goal.maxCalories
      ).map((goal) => goal.name);

      const group = groupedMenus.get(key) ?? {
        weekStartDate,
        menus: [],
      };

      group.menus.push({
        id: menu.id,
        recipeName: menu.recipe.name,
        calories: menu.recipe.calories,
        protein: menu.recipe.protein,
        suitableGoals,
      });

      groupedMenus.set(key, group);
    }

    const result = Array.from(groupedMenus.values())
      .sort((a, b) => {
        const aIsActive = a.weekStartDate.getTime() === currentWeekStart.getTime();
        const bIsActive = b.weekStartDate.getTime() === currentWeekStart.getTime();

        if (aIsActive !== bIsActive) {
          return aIsActive ? -1 : 1;
        }

        return b.weekStartDate.getTime() - a.weekStartDate.getTime();
      })
      .map((group) => ({
        weekStartDate: group.weekStartDate.toISOString(),
        weekEndDate: getEndOfWeek(group.weekStartDate).toISOString(),
        isActiveWeek: group.weekStartDate.getTime() === currentWeekStart.getTime(),
        menus: group.menus,
      }));

    return NextResponse.json({ data: result, goals: goalOptions });
  } catch (error) {
    console.error('[NUTRITIONIST WEEKLY MENUS GET ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch weekly menus.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  const requestingUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });

  if (!requestingUser || requestingUser.role !== 'NUTRITIONIST') {
    return NextResponse.json({ error: 'Forbidden. Nutritionist access required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { recipeId, weekStartDate } = body;

    const normalizedWeekStart = getStartOfWeek(new Date(weekStartDate));
    const nextWeekStart = new Date(normalizedWeekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    nextWeekStart.setHours(0, 0, 0, 0);

    const existingMenu = await prisma.weeklyMenu.findFirst({
      where: {
        recipeId,
        weekStartDate: {
          gte: normalizedWeekStart,
          lt: nextWeekStart,
        },
      },
      select: { id: true },
    });

    if (existingMenu) {
      return NextResponse.json({ data: existingMenu });
    }

    const weeklyMenu = await prisma.weeklyMenu.create({
      data: {
        recipeId,
        weekStartDate: normalizedWeekStart
      }
    });

    return NextResponse.json({ data: weeklyMenu });
  } catch (error) {
    console.error('[NUTRITIONIST WEEKLY MENUS POST ERROR]', error);
    return NextResponse.json({ error: 'Failed to create weekly menu.' }, { status: 500 });
  }
}
