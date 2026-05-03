import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
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

/**
 * API Documentation
 * Endpoint   : POST /api/transactions/generate
 * Deskripsi  : Membuat transaction baru dengan QR dummy untuk user yang sedang login.
 * Method     : POST
 * Auth       : Cookie `token`
 * Body       :
 * {
 *   "amount": 150000
 * }
 */
export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'amount harus berupa number lebih besar dari 0.' },
        { status: 400 }
      );
    }

    const [currentSubscription, latestTransaction] = await Promise.all([
      prisma.subscription.findFirst({
        where: { userId: session.userId },
        select: {
          id: true,
          startDate: true,
          status: true,
          planType: true,
          servings: true,
        },
      }),
      prisma.transaction.findFirst({
        where: { userId: session.userId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const canReuseLatestTransaction =
      currentSubscription &&
      latestTransaction &&
      latestTransaction.status !== 'FAILED' &&
      latestTransaction.amount === amount &&
      latestTransaction.createdAt >= currentSubscription.startDate;

    if (canReuseLatestTransaction) {
      const qrImageDataUrl = await QRCode.toDataURL(latestTransaction.qrisCode, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
      });

      return NextResponse.json(
        {
          message: 'Transaction reused successfully.',
          transaction: latestTransaction,
          qrImageDataUrl,
        },
        { status: 200 }
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: session.userId,
        amount,
        status: 'PENDING',
        qrisCode: `QRIS-DUMMY-${Date.now()}-${randomUUID().slice(0, 8)}`,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const qrImageDataUrl = await QRCode.toDataURL(transaction.qrisCode, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
    });

    return NextResponse.json(
      {
        message: 'Transaction generated successfully.',
        transaction,
        qrImageDataUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[TRANSACTIONS GENERATE ERROR]', error);
    return NextResponse.json(
      { error: 'Gagal membuat transaction.' },
      { status: 500 }
    );
  }
}