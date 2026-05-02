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
    const recipes = await prisma.recipe.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        calories: true,
        protein: true,
        servings: true
      },
      orderBy: { id: 'desc' }
    });

    return NextResponse.json({ data: recipes });
  } catch (error) {
    console.error('[NUTRITIONIST RECIPES GET ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch recipes.' }, { status: 500 });
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
    const { name, description, calories, protein, servings } = body;

    const recipe = await prisma.recipe.create({
      data: {
        name,
        description,
        calories,
        protein,
        servings,
        nutritionistId: session.userId
      }
    });

    return NextResponse.json({ data: recipe });
  } catch (error) {
    console.error('[NUTRITIONIST RECIPES POST ERROR]', error);
    return NextResponse.json({ error: 'Failed to create recipe.' }, { status: 500 });
  }
}
