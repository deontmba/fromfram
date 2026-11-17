import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  applyTransactionStatus,
  resolveTransactionStatus,
  verifyMidtransSignature,
} from '@/controllers/transactionController';
import { TransactionStatus } from '@prisma/client';

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

    const existing = await prisma.transaction.findUnique({
      where: { id: order_id },
      select: { amount: true, status: true },
    });
    if (!existing) {
      console.warn('[MIDTRANS WEBHOOK] Transaction not found in DB:', order_id);
      // Return 200 supaya Midtrans tidak terus retry
      return NextResponse.json({ error: 'Transaction not found.' }, { status: 200 });
    }

    // COMPLETED is final: late/out-of-order or replayed notifications must not downgrade a paid order
    if (existing.status === TransactionStatus.COMPLETED && dbStatus !== TransactionStatus.COMPLETED) {
      console.info('[MIDTRANS WEBHOOK] Ignoring downgrade of completed order:', order_id, dbStatus);
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    // Jangan tandai lunas jika nominal yang dibayar beda dengan tagihan
    if (dbStatus === TransactionStatus.COMPLETED && Number(gross_amount) !== existing.amount) {
      console.warn('[MIDTRANS WEBHOOK] Amount mismatch for order:', order_id, gross_amount, existing.amount);
      return NextResponse.json({ error: 'Amount mismatch.' }, { status: 200 });
    }

    await applyTransactionStatus(order_id, dbStatus, body.payment_type);

    console.info('[MIDTRANS WEBHOOK] Processed:', { order_id, dbStatus });
    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('[MIDTRANS WEBHOOK ERROR]', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
