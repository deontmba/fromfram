import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { CreateTransactionInput } from '@/schemas/transaction';

export async function createTransaction(userId: string, input: CreateTransactionInput) {
  try {
    let basePrice = 0;
    switch (input.planType) {
      case 'MINGGUAN': basePrice = 350000; break;
      case 'BULANAN': basePrice = 1200000; break;
      case 'TAHUNAN': basePrice = 12000000; break;
      default: return { error: 'Tipe langganan tidak valid', status: 400 };
    }

    const finalAmount = basePrice * input.servings;

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: finalAmount,
        status: 'PENDING',
        qrisCode: `QRIS-SIM-${userId}-${Date.now()}`
      }
    });

    return { data: transaction, status: 201 };
  } catch (error) {
    console.error('[Transaction Error]', error);
    return { error: 'Gagal memproses transaksi', status: 500 };
  }
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
            const transactionStatus = midtransData.transaction_status;
            const fraudStatus = midtransData.fraud_status;

            let dbStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | null = null;
            switch (transactionStatus) {
              case 'capture':
                if (fraudStatus === 'challenge') dbStatus = 'PENDING';
                if (fraudStatus === 'accept') dbStatus = 'COMPLETED';
                break;
              case 'settlement':
                dbStatus = 'COMPLETED';
                break;
              case 'pending':
                dbStatus = 'PENDING';
                break;
              case 'cancel':
              case 'deny':
              case 'expire':
                dbStatus = 'FAILED';
                break;
            }

            if (dbStatus && dbStatus !== 'PENDING') {
              // Update status transaksi di database
              transaction = await prisma.transaction.update({
                where: { id: transactionId },
                data: {
                  status: dbStatus,
                  ...(dbStatus === 'COMPLETED' && { paidAt: new Date() }),
                },
              });

              // Jika pembayaran selesai, aktifkan juga subscription di database
              if (dbStatus === 'COMPLETED') {
                const subscription = await prisma.subscription.findUnique({
                  where: { userId },
                });
                if (subscription && subscription.status === 'UNPAID') {
                  await prisma.subscription.update({
                    where: { id: subscription.id },
                    data: { status: 'ACTIVE', startDate: new Date() },
                  });
                  console.info('[Direct Polling] Subscription activated for user:', userId);
                }
              }
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
  const payload = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const hashed = crypto.createHash('sha512').update(payload).digest('hex');
  return hashed === signatureKey;
}