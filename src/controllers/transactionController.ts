import prisma from '@/lib/prisma';
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
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId }
    });
    if (!transaction) return { error: 'Transaksi tidak ditemukan', status: 404 };
    return { data: transaction, status: 200 };
  } catch (error) {
    console.error('[getTransactionStatus Error]', error);
    return { error: 'Gagal mengambil status transaksi', status: 500 };
  }
}