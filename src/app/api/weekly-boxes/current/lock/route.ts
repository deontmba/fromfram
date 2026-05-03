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
 * Endpoint   : PATCH /api/v1/weekly-boxes/current/lock
 * Deskripsi  : Mengunci WeeklyBox yang sedang aktif atau terdekat berikutnya.
 * Method     : PATCH
 * Auth       : Cookie `token`
 */
export async function PATCH(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  try {
    const [pendingBoxResult, latestBoxResult] = await Promise.all([
      prisma.weeklyBox.findFirst({
        where: {
          userId: session.userId,
          status: 'PENDING_SELECTION',
        },
        orderBy: { weekStartDate: 'desc' },
        select: {
          id: true,
          status: true,
          weekStartDate: true,
        },
      }),
      prisma.weeklyBox.findFirst({
        where: {
          userId: session.userId,
        },
        orderBy: { weekStartDate: 'desc' },
        select: {
          id: true,
          status: true,
          weekStartDate: true,
        },
      }),
    ]);

    const box = pendingBoxResult ?? latestBoxResult;

    if (!box) {
      return NextResponse.json({ error: 'Weekly box tidak ditemukan.' }, { status: 404 });
    }

    if (box.status === 'LOCKED' || box.status === 'COMPLETED') {
      return NextResponse.json(
        { message: 'Weekly box already finalized.', data: box },
        { status: 200 }
      );
    }

    if (box.status !== 'PENDING_SELECTION') {
      return NextResponse.json(
        { error: `Tidak bisa mengunci weekly box dengan status "${box.status}".` },
        { status: 400 }
      );
    }

    const updatedBox = await prisma.weeklyBox.update({
      where: { id: box.id },
      data: { status: 'LOCKED' },
    });

    return NextResponse.json(
      { message: 'Weekly box berhasil dikunci.', data: updatedBox },
      { status: 200 }
    );
  } catch (error) {
    console.error('[WEEKLY BOX CURRENT LOCK ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengunci weekly box.' }, { status: 500 });
  }
}