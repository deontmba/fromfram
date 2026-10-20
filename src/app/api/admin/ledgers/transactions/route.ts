import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import prisma from '@/lib/prisma';

async function verifyAdmin(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return { error: session.error };
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
  if (!user || user.role !== 'ADMIN') return { error: 'FORBIDDEN' as const };
  return { userId: session.userId };
}

// GET /api/admin/ledgers/transactions
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if ('error' in auth) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '5', 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { referenceCode: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, ledgers, statsGroup] = await Promise.all([
      prisma.transactionLedger.count({ where }),
      prisma.transactionLedger.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          transaction: { select: { id: true, amount: true, status: true, paidAt: true, createdAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transactionLedger.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    // KPI stats calculations
    const totalRecords = await prisma.transactionLedger.count();
    const pendingCount = statsGroup.find((g: { status: string }) => g.status === 'PENDING')?._count || 0;
    const completedCount = statsGroup.find((g: { status: string }) => g.status === 'COMPLETED')?._count || 0;

    return NextResponse.json({
      data: ledgers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      kpis: {
        totalRecords,
        pendingCount,
        completedCount,
      },
    });
  } catch (error) {
    console.error('[GET TRANSACTION LEDGERS ERROR]', error);
    return NextResponse.json({ error: 'Gagal memuat catatan transaksi.' }, { status: 500 });
  }
}
