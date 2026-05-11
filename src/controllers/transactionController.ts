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