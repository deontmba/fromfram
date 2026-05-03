import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') {
    return NextResponse.json(
      { error: 'Server auth configuration missing.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

type DynamicRouteParams = {
  id: string;
};

interface RouteContext {
  params: Promise<DynamicRouteParams>;
}

/**
 * API Documentation
 * Endpoint   : GET /api/transactions/status/:id
 * Deskripsi  : Mengambil status transaction tertentu milik user yang sedang login.
 * Method     : GET
 * Auth       : Cookie `token`
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        amount: true,
        status: true,
        qrisCode: true,
        paidAt: true,
        createdAt: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found.' },
        { status: 404 }
      );
    }

    if (transaction.userId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    return NextResponse.json({ data: transaction }, { status: 200 });
  } catch (error) {
    console.error('[TRANSACTIONS STATUS GET ERROR]', error);
    return NextResponse.json(
      { error: 'Gagal mengambil status transaction.' },
      { status: 500 }
    );
  }
}