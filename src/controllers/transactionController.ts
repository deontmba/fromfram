import { randomUUID } from 'crypto';
import QRCode from 'qrcode';
import prisma from '@/lib/prisma';

export async function getAllTransactions(userId: string) {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return { data: { data: transactions }, status: 200 };
}

export async function getTransactionStatus(userId: string, transactionId: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
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
    return { error: 'Transaction not found.', status: 404 };
  }

  if (transaction.userId !== userId) {
    return { error: 'Forbidden.', status: 403 };
  }

  return { data: { data: transaction }, status: 200 };
}

export async function generateTransaction(userId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'amount harus berupa number lebih besar dari 0.', status: 400 };
  }

  const [currentSubscription, latestTransaction] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId },
      select: {
        id: true,
        startDate: true,
        status: true,
        planType: true,
        servings: true,
      },
    }),
    prisma.transaction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  // Reuse transaksi lama jika masih valid
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

    return {
      data: {
        message: 'Transaction reused successfully.',
        transaction: latestTransaction,
        qrImageDataUrl,
      },
      status: 200,
    };
  }

  const orderId = `ORDER-${Date.now()}-${randomUUID().slice(0, 8)}`;

  const transaction = await prisma.transaction.create({
    data: {
      id: orderId,
      userId,
      amount,
      status: 'PENDING',
      qrisCode: 'PENDING_MIDTRANS',
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const apiUrl = isProduction
    ? 'https://api.midtrans.com/v2/charge'
    : 'https://api.sandbox.midtrans.com/v2/charge';

  // Fallback dummy QRIS jika tidak ada server key
  if (!serverKey) {
    console.warn('Midtrans Server Key is missing. Using dummy QRIS.');
    const dummyQris = `QRIS-DUMMY-${orderId}`;

    await prisma.transaction.update({
      where: { id: orderId },
      data: { qrisCode: dummyQris },
    });

    const qrImageDataUrl = await QRCode.toDataURL(dummyQris, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
    });

    return {
      data: {
        message: 'Dummy transaction generated.',
        transaction: { ...transaction, qrisCode: dummyQris },
        qrImageDataUrl,
      },
      status: 201,
    };
  }

  // Hit Midtrans API
  const midtransPayload = {
    payment_type: 'qris',
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    customer_details: {
      first_name: transaction.user.name,
      email: transaction.user.email,
    },
  };

  const midtransRes = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(serverKey + ':').toString('base64'),
    },
    body: JSON.stringify(midtransPayload),
  });

  const midtransData = await midtransRes.json();

  if (
    !midtransRes.ok ||
    (midtransData.status_code !== '201' && midtransData.status_code !== '200')
  ) {
    console.error('Midtrans Error:', midtransData);
    throw new Error(midtransData.status_message || 'Gagal generate QRIS Midtrans');
  }

  const qrString =
    midtransData.qr_string ||
    midtransData.actions?.find((a: { name: string; url: string }) => a.name === 'generate-qr-code')?.url ||
    'ERROR';

  const updatedTransaction = await prisma.transaction.update({
    where: { id: orderId },
    data: { qrisCode: qrString },
  });

  const qrImageDataUrl = await QRCode.toDataURL(qrString, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
  });

  return {
    data: {
      message: 'Transaction generated successfully.',
      transaction: updatedTransaction,
      qrImageDataUrl,
    },
    status: 201,
  };
}