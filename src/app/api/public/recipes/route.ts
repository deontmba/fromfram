import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const recipes = await prisma.recipe.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        calories: true,
        protein: true,
        imageUrl: true,
      }
    });

    return NextResponse.json(recipes);
  } catch (error) {
    console.error('[PUBLIC_RECIPES_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
