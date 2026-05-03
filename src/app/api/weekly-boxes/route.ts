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
 * Endpoint   : GET /api/v1/weekly-boxes
 * Deskripsi  : Mengambil semua WeeklyBox milik user yang sedang login.
 * Method     : GET
 * Auth       : Cookie `token`
 */
export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  try {
    const boxes = await prisma.weeklyBox.findMany({
      where: { userId: session.userId },
      orderBy: { weekStartDate: 'desc' },
      include: {
        mealSelections: {
          include: {
            recipe: {
              select: {
                id: true,
                name: true,
                calories: true,
                protein: true,
                imageUrl: true,
              },
            },
          },
        },
        deliveries: {
          select: {
            id: true,
            deliveryDate: true,
            status: true,
            shippedAt: true,
            deliveredAt: true,
          },
        },
      },
    });

    return NextResponse.json({ data: boxes });
  } catch (error) {
    console.error('[WEEKLY BOXES GET ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil weekly boxes.' }, { status: 500 });
  }
}