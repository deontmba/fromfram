import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import prisma from '@/lib/prisma';

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

    const goals = await prisma.goal.findMany();

    const result = weeklyMenus.map(menu => {
      const suitableGoals = goals.filter(g => 
        menu.recipe.calories >= g.minCalories && 
        menu.recipe.calories <= g.maxCalories
      ).map(g => g.name);

      return {
        id: menu.id,
        recipeName: menu.recipe.name,
        calories: menu.recipe.calories,
        protein: menu.recipe.protein,
        suitableGoals
      };
    });

    return NextResponse.json({ data: result });
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

    const weeklyMenu = await prisma.weeklyMenu.create({
      data: {
        recipeId,
        weekStartDate: new Date(weekStartDate)
      }
    });

    return NextResponse.json({ data: weeklyMenu });
  } catch (error) {
    console.error('[NUTRITIONIST WEEKLY MENUS POST ERROR]', error);
    return NextResponse.json({ error: 'Failed to create weekly menu.' }, { status: 500 });
  }
}
