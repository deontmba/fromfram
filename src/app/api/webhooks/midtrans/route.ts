import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { SubscriptionStatus, TransactionStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[MIDTRANS WEBHOOK]', body);

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status
    } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    
    // Hash validation
    const hash = crypto.createHash('sha512');
    hash.update(order_id + status_code + gross_amount + serverKey);
    const expectedSignature = hash.digest('hex');

    if (expectedSignature !== signature_key) {
      console.warn('[MIDTRANS WEBHOOK] Invalid signature', { expectedSignature, signature_key });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Determine status
    let dbStatus: TransactionStatus = TransactionStatus.PENDING;

    if (transaction_status == 'capture') {
      if (fraud_status == 'challenge') dbStatus = TransactionStatus.PENDING;
      else if (fraud_status == 'accept') dbStatus = TransactionStatus.COMPLETED;
    } else if (transaction_status == 'settlement') {
      dbStatus = TransactionStatus.COMPLETED;
    } else if (transaction_status == 'cancel' || transaction_status == 'deny' || transaction_status == 'expire') {
      dbStatus = TransactionStatus.FAILED;
    } else if (transaction_status == 'pending') {
      dbStatus = TransactionStatus.PENDING;
    }

    // Update Transaction
    const transaction = await prisma.transaction.update({
      where: { id: order_id },
      data: {
        status: dbStatus,
        ...(dbStatus === TransactionStatus.COMPLETED && { paidAt: new Date() }),
      },
    });

    // Update Subscription if needed
    if (dbStatus === TransactionStatus.COMPLETED) {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: transaction.userId },
      });

      if (subscription && subscription.status === SubscriptionStatus.UNPAID) {
         await prisma.subscription.update({
           where: { id: subscription.id },
           data: { status: SubscriptionStatus.ACTIVE, startDate: new Date() }
         });
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('[MIDTRANS WEBHOOK ERROR]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
