import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import prisma from '@/lib/prisma';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') {
    return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  }
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

/**
 * API Documentation
 * Endpoint   : GET /api/v1/meal-selections/:weeklyBoxId
 * Deskripsi  : Mengambil pilihan menu yang sudah disimpan untuk suatu WeeklyBox.
 * Method     : GET
 * Auth       : Cookie `token`
 * Params     : weeklyBoxId — ID dari WeeklyBox
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { weeklyBoxId: string } }
) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  try {
    const box = await prisma.weeklyBox.findUnique({
      where: { id: params.weeklyBoxId },
    });

    if (!box) {
      return NextResponse.json({ error: 'Weekly box tidak ditemukan.' }, { status: 404 });
    }

    // Only owner or admin can view
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (box.userId !== session.userId && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const selections = await prisma.mealSelection.findMany({
      where: { weeklyBoxId: params.weeklyBoxId },
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
            ingredients: {
              include: {
                ingredient: {
                  select: {
                    name: true,
                    origin: true,
                    supplierName: true,
                    isAllergen: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { dayOfWeek: 'asc' },
    });

    return NextResponse.json({
      weeklyBoxId: params.weeklyBoxId,
      weekStartDate: box.weekStartDate,
      status: box.status,
      selectionDeadline: box.selectionDeadline,
      isAutoSelected: box.isAutoSelected,
      data: selections,
    });
  } catch (error) {
    console.error('[MEAL SELECTION GET ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil pilihan menu.' }, { status: 500 });
  }
}