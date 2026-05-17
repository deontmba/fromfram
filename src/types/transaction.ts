import { TransactionStatus } from '@prisma/client';

export interface TransactionData {
  id: string;
  amount: number;
  status: TransactionStatus;
  qrisCode: string;
  paidAt: Date | null;
  createdAt: Date;
}

export interface CreateTransactionInput {
  amount: number;
  qrisCode: string;
}