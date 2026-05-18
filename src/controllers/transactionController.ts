import { randomUUID } from 'crypto';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

function getMidtransConfig() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? '';
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const baseUrl = isProduction
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com';
  const authHeader = 'Basic ' + Buffer.from(serverKey + ':').toString('base64');
  return { serverKey, isProduction, baseUrl, authHeader };
}

function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string,
): 'PENDING' | 'COMPLETED' | 'FAILED' | null {
  switch (transactionStatus) {
    case 'capture':
      if (fraudStatus === 'challenge') return 'PENDING';
      if (fraudStatus === 'accept') return 'COMPLETED';
      return 'PENDING';
    case 'settlement':
      return 'COMPLETED';
    case 'pending':
      return 'PENDING';
    case 'cancel':
    case 'deny':
    case 'expire':
      return 'FAILED';
    default:
      return null;
  }
}

async function activateSubscriptionIfNeeded(userId: string) {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { id: true, status: true },
    });
    if (subscription && subscription.status === 'UNPAID') {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'ACTIVE', startDate: new Date() },
      });
    }
  } catch (err) {
    console.error('[activateSubscriptionIfNeeded]', err);
  }
}

export async function getAllTransactions(userId: string) {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
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

  if (!transaction) return { error: 'Transaction not found.', status: 404 };
  if (transaction.userId !== userId) return { error: 'Forbidden.', status: 403 };

  // Sync ke Midtrans jika masih PENDING
  if (transaction.status === 'PENDING') {
    const { serverKey, authHeader } = getMidtransConfig();
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    const statusUrl = isProduction
      ? `https://api.midtrans.com/v2/${encodeURIComponent(transactionId)}/status`
      : `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(transactionId)}/status`;

    if (serverKey) {
      try {
        const res = await fetch(statusUrl, {
          method: 'GET',
          headers: { Accept: 'application/json', Authorization: authHeader },
          signal: AbortSignal.timeout(8_000),
        });

        if (res.ok) {
          const data = await res.json();
          const newStatus = mapMidtransStatus(data.transaction_status, data.fraud_status);

          if (newStatus && newStatus !== transaction.status) {
            const updated = await prisma.transaction.update({
              where: { id: transactionId },
              data: {
                status: newStatus,
                ...(newStatus === 'COMPLETED' && { paidAt: new Date() }),
              },
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

            if (newStatus === 'COMPLETED') {
              await activateSubscriptionIfNeeded(userId);
            }

            return { data: { data: updated }, status: 200 };
          }
        }
      } catch (err) {
        console.warn('[getTransactionStatus] Midtrans sync failed:', err);
      }
    }
  }

  return { data: { data: transaction }, status: 200 };
}

export async function generateTransaction(userId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'amount harus berupa number lebih besar dari 0.', status: 400 };
  }

  const { serverKey, baseUrl, authHeader } = getMidtransConfig();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  if (!user) return { error: 'User tidak ditemukan.', status: 404 };

  const currentSubscription = await prisma.subscription.findFirst({
    where: { userId },
    select: { id: true, status: true },
  });

  // Reuse snap token jika transaksi PENDING dengan amount sama masih ada
  const existingPending = await prisma.transaction.findFirst({
    where: { userId, status: 'PENDING', amount },
    orderBy: { createdAt: 'desc' },
  });

  const canReuse =
    currentSubscription?.status === 'UNPAID' &&
    existingPending !== null &&
    existingPending.qrisCode !== 'PENDING_SNAP' &&
    existingPending.qrisCode !== '';

  if (canReuse && existingPending) {
    return {
      data: {
        message: 'Transaction reused successfully.',
        transaction: existingPending,
        snapToken: existingPending.qrisCode, // qrisCode dipakai sebagai snapToken
      },
      status: 200,
    };
  }

  const orderId = `ORDER-${Date.now()}-${randomUUID().slice(0, 8)}`;

  // Simpan dulu ke DB dengan token placeholder
  const transaction = await prisma.transaction.create({
    data: {
      id: orderId,
      userId,
      amount,
      status: 'PENDING',
      qrisCode: 'PENDING_SNAP',
    },
  });

  // Fallback jika tidak ada server key (dev mode)
  if (!serverKey) {
    console.warn('[generateTransaction] No MIDTRANS_SERVER_KEY, using dummy token.');
    const dummyToken = `DUMMY-TOKEN-${orderId}`;
    await prisma.transaction.update({
      where: { id: orderId },
      data: { qrisCode: dummyToken },
    });
    return {
      data: {
        message: 'Dummy transaction generated.',
        transaction: { ...transaction, qrisCode: dummyToken },
        snapToken: dummyToken,
      },
      status: 201,
    };
  }

  // Request Snap Token ke Midtrans
  const snapPayload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    customer_details: {
      first_name: user.name ?? 'Customer',
      email: user.email,
    },
    callbacks: {
      finish: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
    },
  };

  let snapData: Record<string, unknown>;

  try {
    const snapRes = await fetch(`${baseUrl}/snap/v1/transactions`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(snapPayload),
      signal: AbortSignal.timeout(15_000),
    });

    snapData = await snapRes.json();

    if (!snapRes.ok || !snapData.token) {
      console.error('[generateTransaction] Midtrans Snap error:', snapData);
      await prisma.transaction.delete({ where: { id: orderId } }).catch(() => null);
      return {
        error:
          typeof snapData.error_messages === 'object'
            ? JSON.stringify(snapData.error_messages)
            : 'Gagal generate Snap Token.',
        status: 502,
      };
    }
  } catch (err) {
    console.error('[generateTransaction] Fetch error:', err);
    await prisma.transaction.delete({ where: { id: orderId } }).catch(() => null);
    return { error: 'Tidak dapat terhubung ke Midtrans.', status: 502 };
  }

  const snapToken = snapData.token as string;

  const updatedTransaction = await prisma.transaction.update({
    where: { id: orderId },
    data: { qrisCode: snapToken }, // simpan snapToken di field qrisCode
  });

  return {
    data: {
      message: 'Transaction generated successfully.',
      transaction: updatedTransaction,
      snapToken,
    },
    status: 201,
  };
}

export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
): boolean {
  const { serverKey } = getMidtransConfig();
  const expected = crypto
    .createHash('sha512')
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest('hex');
  return expected === signatureKey;
}