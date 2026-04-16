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
 * Endpoint   : PATCH /api/v1/weekly-boxes/:id/skip
 * Deskripsi  : Men-skip WeeklyBox. Hanya bisa dilakukan jika status masih PENDING_SELECTION.
 * Method     : PATCH
 * Auth       : Cookie `token`
 * Params     : id — ID dari WeeklyBox
 */

// Define the runtime shape of your parameters
type DynamicRouteParams = {
  id: string; // The dynamic segment for the weekly box ID
};

// Define the RouteContext as the build system expects it (with Promise in params)
interface RouteContext {
  params: Promise<DynamicRouteParams>; // <--- Crucial change here
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext // <--- Change argument name and type here
) {
  // Await context.params to satisfy the TypeScript compiler and correctly access params
  const { id } = await context.params; // <--- FIX: Add 'await' here and destructure from context.params

  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  try {
    const box = await prisma.weeklyBox.findUnique({
      where: { id: id }, // <--- FIX: Use the 'id' variable
    });

    if (!box) {
      return NextResponse.json({ error: 'Weekly box tidak ditemukan.' }, { status: 404 });
    }

    if (box.userId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    if (box.status !== 'PENDING_SELECTION') {
      return NextResponse.json(
        { error: `Tidak bisa skip box dengan status "${box.status}". Hanya PENDING_SELECTION yang bisa di-skip.` },
        { status: 400 }
      );
    }

    const updatedBox = await prisma.weeklyBox.update({
      where: { id: id }, // <--- FIX: Use the 'id' variable
      data: { status: 'SKIPPED' },
    });

    return NextResponse.json({ message: 'Weekly box berhasil di-skip.', data: updatedBox });
  } catch (error) {
    console.error('[WEEKLY BOX SKIP ERROR]', error);
    return NextResponse.json({ error: 'Gagal skip weekly box.' }, { status: 500 });
  }
}