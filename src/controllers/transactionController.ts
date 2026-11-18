import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { TransactionStatus } from '@prisma/client';
import { lockCurrentWeeklyBox } from '@/controllers/weeklyBoxController';

/**
 * Map Midtrans transaction_status + fraud_status ke TransactionStatus enum Prisma.
 * Return null jika tidak perlu update (status tidak dikenal).
 */
export function resolveTransactionStatus(
  transactionStatus: string,
  fraudStatus?: string,
): TransactionStatus | null {
  switch (transactionStatus) {
    case 'capture':
      return fraudStatus === 'accept' ? TransactionStatus.COMPLETED : TransactionStatus.PENDING;
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

/**
 * Satu-satunya jalur untuk menerapkan status Midtrans: update transaksi,
 * sinkron TransactionLedger, dan aktifkan subscription jika lunas.
 * Dipakai oleh webhook dan polling status.
 */
export async function applyTransactionStatus(transactionId: string, status: TransactionStatus, paymentMethod?: string) {
  const transaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status,
      ...(status === TransactionStatus.COMPLETED && { paidAt: new Date() }),
    },
  });

  const ledgerUpdate = await prisma.transactionLedger.updateMany({
    where: { transactionId },
    data: { status },
  }).catch(err => {
    console.warn('[UPDATE TRANSACTION LEDGER STATUS WARNING]', err);
    return null;
  });

  // Snap payments never wrote a ledger row; create it on first status change so admin Pencatatan sees them.
  if (ledgerUpdate && ledgerUpdate.count === 0) {
    const subscription = await prisma.subscription
      .findUnique({ where: { userId: transaction.userId }, select: { planType: true, servings: true } })
      .catch(() => null);
    await prisma.transactionLedger.create({
      data: {
        transactionId,
        userId: transaction.userId,
        amount: transaction.amount,
        status,
        paymentMethod: (paymentMethod ?? 'MIDTRANS').toUpperCase(),
        code: `TRX-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        referenceCode: `INV/FF/${transactionId.split('-').pop()?.toUpperCase() ?? transactionId}`,
        metadata: subscription ? { planType: subscription.planType, servings: subscription.servings } : undefined,
      },
    }).catch(err => console.warn('[CREATE TRANSACTION LEDGER WARNING]', err));
  }

  if (status === TransactionStatus.COMPLETED) {
    const activated = await prisma.subscription.updateMany({
      where: { userId: transaction.userId, status: 'UNPAID' },
      data: { status: 'ACTIVE', startDate: new Date() },
    });
    if (activated.count > 0) {
      console.info('[PAYMENT] Subscription activated for user:', transaction.userId);
    }

    // Lock the box server-side so deliveries exist even if the user closed the payment tab.
    const locked = await lockCurrentWeeklyBox(transaction.userId).catch((err) => ({ error: String(err), status: 500 }));
    if ('error' in locked) {
      console.warn('[PAYMENT] Auto-lock weekly box skipped:', transaction.userId, locked.error);
    }
  }

  return transaction;
}

export async function getAllTransactions(userId: string) {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    return { data: transactions, status: 200 };
  } catch (error) {
    console.error('[getAllTransactions Error]', error);
    return { error: 'Gagal mengambil data transaksi', status: 500 };
  }
}

export async function getTransactionStatus(userId: string, transactionId: string) {
  try {
    let transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId }
    });
    if (!transaction) return { error: 'Transaksi tidak ditemukan', status: 404 };

    // Jika transaksi masih PENDING, sync proaktif dengan Midtrans API
    if (transaction.status === 'PENDING') {
      const serverKey = process.env.MIDTRANS_SERVER_KEY ?? '';
      if (serverKey) {
        try {
          const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
          const baseUrl = isProduction
            ? 'https://api.midtrans.com'
            : 'https://api.sandbox.midtrans.com';
          const url = `${baseUrl}/v2/${transactionId}/status`;
          const authHeader = 'Basic ' + Buffer.from(serverKey + ':').toString('base64');

          const midtransRes = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': authHeader,
            },
          });

          if (midtransRes.ok) {
            const midtransData = await midtransRes.json();
            const dbStatus = resolveTransactionStatus(midtransData.transaction_status, midtransData.fraud_status);
            const paidAmountOk = Number(midtransData.gross_amount) === transaction.amount;

            if (dbStatus && dbStatus !== 'PENDING' && (dbStatus !== 'COMPLETED' || paidAmountOk)) {
              transaction = await applyTransactionStatus(transactionId, dbStatus);
            }
          }
        } catch (fetchError) {
          console.warn('[Direct Polling Warning] Failed to check status from Midtrans API:', fetchError);
        }
      }
    }

    return { data: transaction, status: 200 };
  } catch (error) {
    console.error('[getTransactionStatus Error]', error);
    return { error: 'Gagal mengambil status transaksi', status: 500 };
  }
}

export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? '';
  // Tanpa server key, signature bisa dibuat siapa saja.
  if (!serverKey) return false;
  const payload = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const hashed = Buffer.from(crypto.createHash('sha512').update(payload).digest('hex'));
  const given = Buffer.from(signatureKey);
  return hashed.length === given.length && crypto.timingSafeEqual(hashed, given);
}
