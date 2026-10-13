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

type ImportRow = {
  name: string;
  stockKg: number;
};

// POST /api/admin/ingredients/bulk-stock-import
// Body: JSON array of { name: string, stockKg: number }
// Untuk setiap row: cari ingredient by name (case-insensitive), update stockKg
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if ('error' in auth) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  try {
    const body = await req.json();
    const rows: ImportRow[] = body.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Data tidak valid atau kosong.' }, { status: 400 });
    }

    const results: Array<{ name: string; status: 'updated' | 'not_found' | 'invalid'; message?: string }> = [];

    for (const row of rows) {
      if (!row.name || typeof row.name !== 'string') {
        results.push({ name: String(row.name || ''), status: 'invalid', message: 'Nama tidak valid.' });
        continue;
      }

      const stockKg = Number(row.stockKg);
      if (isNaN(stockKg) || stockKg < 0) {
        results.push({ name: row.name, status: 'invalid', message: 'stockKg tidak valid (harus angka >= 0).' });
        continue;
      }

      // Case-insensitive search
      const ingredient = await prisma.ingredient.findFirst({
        where: { name: { equals: row.name.trim(), mode: 'insensitive' } },
        select: { id: true, name: true },
      });

      if (!ingredient) {
        results.push({ name: row.name, status: 'not_found', message: 'Bahan baku tidak ditemukan di database.' });
        continue;
      }

      await prisma.ingredient.update({
        where: { id: ingredient.id },
        data: { stockKg },
      });

      results.push({ name: ingredient.name, status: 'updated' });
    }

    const updatedCount = results.filter((r) => r.status === 'updated').length;
    const notFoundCount = results.filter((r) => r.status === 'not_found').length;
    const invalidCount = results.filter((r) => r.status === 'invalid').length;

    return NextResponse.json({
      summary: { updatedCount, notFoundCount, invalidCount, totalRows: rows.length },
      results,
    });
  } catch (error) {
    console.error('[ADMIN BULK STOCK IMPORT ERROR]', error);
    return NextResponse.json({ error: 'Gagal memproses impor data.' }, { status: 500 });
  }
}
