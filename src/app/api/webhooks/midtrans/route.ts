import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMidtransSignature } from '@/controllers/transactionController';
import { SubscriptionStatus, TransactionStatus } from '@prisma/client';

/**
 * Map Midtrans transaction_status + fraud_status ke TransactionStatus enum Prisma.
 * Return null jika tidak perlu update (status tidak dikenal).
 */
function resolveTransactionStatus(
  transactionStatus: string,
  fraudStatus?: string,
): TransactionStatus | null {
  switch (transactionStatus) {
    case 'capture':
      if (fraudStatus === 'challenge') return TransactionStatus.PENDING;
      if (fraudStatus === 'accept') return TransactionStatus.COMPLETED;
      return TransactionStatus.PENDING;
    case 'settlement':
      return TransactionStatus.COMPLETED;
    case 'pending':
      return TransactionStatus.PENDING;
    case 'cancel':
    case 'deny':
    case 'expire':
      return TransactionStatus.FAILED;
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = body as Record<string, string | undefined>;

    // Validasi field wajib
    if (!order_id || !status_code || !gross_amount || !signature_key || !transaction_status) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Verifikasi signature
    const isValid = verifyMidtransSignature(order_id, status_code, gross_amount, signature_key);
    if (!isValid) {
      console.warn('[MIDTRANS WEBHOOK] Invalid signature for order:', order_id);
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 403 });
    }

    const dbStatus = resolveTransactionStatus(transaction_status, fraud_status);

    // Status tidak dikenal — acknowledge saja supaya Midtrans tidak retry terus
    if (dbStatus === null) {
      console.info('[MIDTRANS WEBHOOK] Unknown transaction_status, ignoring:', transaction_status);
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    // Update transaksi
    const transaction = await prisma.transaction.update({
      where: { id: order_id },
      data: {
        status: dbStatus,
        ...(dbStatus === TransactionStatus.COMPLETED && { paidAt: new Date() }),
      },
      select: { id: true, userId: true, status: true },
    });

    // Aktifkan subscription jika pembayaran sukses
    if (dbStatus === TransactionStatus.COMPLETED) {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: transaction.userId },
        select: { id: true, status: true },
      });

      if (subscription && subscription.status === SubscriptionStatus.UNPAID) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: SubscriptionStatus.ACTIVE, startDate: new Date() },
        });
        console.info('[MIDTRANS WEBHOOK] Subscription activated for user:', transaction.userId);
      }
    }

    console.info('[MIDTRANS WEBHOOK] Processed:', { order_id, dbStatus });
    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    // Jika transaksi tidak ditemukan di DB
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      console.warn('[MIDTRANS WEBHOOK] Transaction not found in DB:', error);
      // Return 200 supaya Midtrans tidak terus retry
      return NextResponse.json({ error: 'Transaction not found.' }, { status: 200 });
    }

    console.error('[MIDTRANS WEBHOOK ERROR]', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}