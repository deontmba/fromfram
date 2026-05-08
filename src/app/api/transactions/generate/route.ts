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

    const orderId = `ORDER-${Date.now()}-${randomUUID().slice(0, 8)}`;

    const transaction = await prisma.transaction.create({
      data: {
        id: orderId,
        userId: session.userId,
        amount,
        status: 'PENDING',
        qrisCode: `PENDING_MIDTRANS`,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    const apiUrl = isProduction ? 'https://api.midtrans.com/v2/charge' : 'https://api.sandbox.midtrans.com/v2/charge';

    if (!serverKey) {
      console.warn("Midtrans Server Key is missing. Using dummy QRIS.");
      // Fallback to dummy QRIS if no key is provided
      const dummyQris = `QRIS-DUMMY-${orderId}`;
      await prisma.transaction.update({
        where: { id: orderId },
        data: { qrisCode: dummyQris }
      });
      const qrImageDataUrl = await QRCode.toDataURL(dummyQris, { errorCorrectionLevel: 'M', margin: 2, width: 320 });
      return NextResponse.json({ message: 'Dummy transaction generated.', transaction: { ...transaction, qrisCode: dummyQris }, qrImageDataUrl }, { status: 201 });
    }

    const midtransPayload = {
      payment_type: 'qris',
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: transaction.user.name,
        email: transaction.user.email,
      }
    };

    const midtransRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(serverKey + ':').toString('base64'),
      },
      body: JSON.stringify(midtransPayload),
    });

    const midtransData = await midtransRes.json();

    if (!midtransRes.ok || (midtransData.status_code !== '201' && midtransData.status_code !== '200')) {
      console.error('Midtrans Error:', midtransData);
      throw new Error(midtransData.status_message || 'Gagal generate QRIS Midtrans');
    }

    const qrString = midtransData.qr_string || midtransData.actions?.find((a: any) => a.name === 'generate-qr-code')?.url || 'ERROR';

    const updatedTransaction = await prisma.transaction.update({
      where: { id: orderId },
      data: { qrisCode: qrString },
    });

    const qrImageDataUrl = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
    });

    return NextResponse.json(
      {
        message: 'Transaction generated successfully.',
        transaction: updatedTransaction,
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