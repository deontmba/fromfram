import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import prisma from '@/lib/prisma';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') {
    return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  }
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
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay());
    currentWeekStart.setHours(0,0,0,0);

    const [totalRecipes, weeklyMenusCount, activeUsers] = await prisma.$transaction([
      prisma.recipe.count(),
      prisma.weeklyMenu.count(),
      prisma.subscription.count({
        where: { status: 'ACTIVE' }
      })
    ]);

    return NextResponse.json({
      data: {
        totalRecipes,
        weeklyMenusCount,
        activeUsers,
      }
    });
  } catch (error) {
    console.error('[NUTRITIONIST KPIs GET ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch KPIs.' }, { status: 500 });
  }
}
