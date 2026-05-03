import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import prisma from '@/lib/prisma';

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
    
    const { name, description, calories, protein, servings, imageUrl } = body;

    const updatedRecipe = await prisma.recipe.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(calories !== undefined && { calories }),
        ...(protein !== undefined && { protein }),
        ...(servings !== undefined && { servings }),
        ...(imageUrl !== undefined && { imageUrl }),
      }
    });

    return NextResponse.json({ data: updatedRecipe });
  } catch (error) {
    console.error('[NUTRITIONIST RECIPE PATCH ERROR]', error);
    return NextResponse.json({ error: 'Failed to update recipe.' }, { status: 500 });
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

    await prisma.recipe.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Recipe deleted.' });
  } catch (error) {
    console.error('[NUTRITIONIST RECIPE DELETE ERROR]', error);
    return NextResponse.json({ error: 'Failed to delete recipe. It might be in use.' }, { status: 500 });
  }
}
