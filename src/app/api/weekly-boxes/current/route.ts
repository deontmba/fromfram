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
 * Endpoint   : GET /api/v1/weekly-boxes/current
 * Deskripsi  : Mengambil WeeklyBox untuk minggu berjalan milik user yang sedang login.
 * Method     : GET
 * Auth       : Cookie `token`
 */
export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  try {
    const now = new Date();

    const currentBox = await prisma.weeklyBox.findFirst({
      where: {
        userId: session.userId,
        weekStartDate: { lte: now },
        weekEndDate: { gte: now },
      },
      include: {
        mealSelections: {
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
          orderBy: { dayOfWeek: 'asc' },
        },
        deliveries: {
          select: {
            id: true,
            deliveryDate: true,
            status: true,
            shippedAt: true,
            deliveredAt: true,
          },
          orderBy: { deliveryDate: 'asc' },
        },
      },
    });

    if (!currentBox) {
      return NextResponse.json(
        { error: 'Tidak ada weekly box aktif untuk minggu ini.' },
        { status: 404 }
      );
    }

    const isDeadlinePassed = now > currentBox.selectionDeadline;

    return NextResponse.json({ data: { ...currentBox, isDeadlinePassed } });
  } catch (error) {
    console.error('[WEEKLY BOX CURRENT GET ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil weekly box saat ini.' }, { status: 500 });
  }
}