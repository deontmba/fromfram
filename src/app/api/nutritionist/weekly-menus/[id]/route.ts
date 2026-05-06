import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import prisma from '@/lib/prisma';
import { getStartOfWeek } from '@/lib/week';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export async function PATCH(req: NextRequest, context: { params: any }) {
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
    const params = await Promise.resolve(context.params);
    const id = params.id;
    const body = await req.json();
    
    const { recipeId, weekStartDate } = body;
    const normalizedWeekStart = weekStartDate ? getStartOfWeek(new Date(weekStartDate)) : undefined;

    const updatedMenu = await prisma.weeklyMenu.update({
      where: { id },
      data: {
        ...(recipeId && { recipeId }),
        ...(normalizedWeekStart && { weekStartDate: normalizedWeekStart })
      }
    });

    return NextResponse.json({ data: updatedMenu });
  } catch (error) {
    console.error('[NUTRITIONIST WEEKLY MENU PATCH ERROR]', error);
    return NextResponse.json({ error: 'Failed to update weekly menu.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: any }) {
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
    const params = await Promise.resolve(context.params);
    const id = params.id;

    await prisma.weeklyMenu.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Weekly menu deleted.' });
  } catch (error) {
    console.error('[NUTRITIONIST WEEKLY MENU DELETE ERROR]', error);
    return NextResponse.json({ error: 'Failed to delete weekly menu.' }, { status: 500 });
  }
}
