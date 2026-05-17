import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUserId } from '@/lib/session';
import { generateTransaction } from '@/controllers/transactionController';

function getSnapBaseUrl() {
  return process.env.MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com';
}

function getSnapTransactionUrl() {
  return `${getSnapBaseUrl()}/snap/v1/transactions`;
}

function getSnapRedirectUrl(token: string) {
  return `${getSnapBaseUrl()}/snap/v2/vtweb/${token}`;
}

function getEnabledPayments() {
  const configuredPayments = process.env.MIDTRANS_ENABLED_PAYMENTS;

  if (!configuredPayments) {
    return undefined;
  }

  const enabledPayments = configuredPayments
    .split(',')
    .map((payment) => payment.trim())
    .filter(Boolean);

  return enabledPayments.length > 0 ? enabledPayments : undefined;
}

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') {
    return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  }
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const body = await req.json().catch(() => ({}));
    const requestedAmount = Number(body?.amount);

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return NextResponse.json(
        { error: 'amount harus berupa number lebih besar dari 0.' },
        { status: 400 }
      );
    }

    const amount = requestedAmount;

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
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

    const canReuseLatestTransaction =
      currentSubscription &&
      latestTransaction &&
      latestTransaction.status !== 'FAILED' &&
      latestTransaction.status !== 'COMPLETED' &&
      latestTransaction.amount === amount &&
      latestTransaction.qrisCode !== 'PENDING_SNAP' &&
      latestTransaction.createdAt >= currentSubscription.startDate;

    if (canReuseLatestTransaction) {
      const snapToken = latestTransaction.qrisCode;
      const redirectUrl = getSnapRedirectUrl(snapToken);

      return NextResponse.json(
        {
          message: 'Transaction reused successfully.',
          transaction: {
            ...latestTransaction,
            snapToken,
            redirectUrl,
          },
          snapToken,
          redirectUrl,
        },
        { status: 200 }
      );
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    if (!serverKey) {
      return NextResponse.json(
        { error: 'Midtrans Server Key belum dikonfigurasi untuk Snap checkout.' },
        { status: 500 }
      );
    }

    const orderId = `ORDER-${Date.now()}-${randomUUID().slice(0, 8)}`;

    const transaction = await prisma.transaction.create({
      data: {
        id: orderId,
        userId: session.userId,
        amount,
        status: 'PENDING',
        qrisCode: `PENDING_SNAP`,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const midtransPayload: Record<string, unknown> = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: transaction.user.name,
        email: transaction.user.email,
      },
      item_details: [
        {
          id: 'subscription-plan',
          name: 'FromFram Subscription',
          quantity: 1,
          price: amount,
        },
      ],
    };

    const enabledPayments = getEnabledPayments();
    if (enabledPayments) {
      midtransPayload.enabled_payments = enabledPayments;
    }

    const midtransRes = await fetch(getSnapTransactionUrl(), {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(serverKey + ':').toString('base64'),
      },
      body: JSON.stringify(midtransPayload),
    });

    const midtransData = await midtransRes.json();

    if (!midtransRes.ok) {
      console.error('Midtrans Error:', midtransData);
      throw new Error(
        typeof midtransData.status_message === 'string' && midtransData.status_message
          ? midtransData.status_message
          : `Gagal generate Snap Midtrans (${midtransRes.status})`
      );
    }

    const snapToken = typeof midtransData.token === 'string' ? midtransData.token : '';
    const redirectUrl = typeof midtransData.redirect_url === 'string'
      ? midtransData.redirect_url
      : getSnapRedirectUrl(snapToken);

    if (!snapToken) {
      throw new Error('Snap token tidak ditemukan di response Midtrans.');
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id: orderId },
      data: { qrisCode: snapToken },
    });

    return NextResponse.json(
      {
        message: 'Transaction generated successfully.',
        transaction: {
          ...updatedTransaction,
          snapToken,
          redirectUrl,
        },
        snapToken,
        redirectUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[TRANSACTIONS GENERATE ERROR]', error);
    const message = error instanceof Error && error.message ? error.message : 'Gagal membuat transaction.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}