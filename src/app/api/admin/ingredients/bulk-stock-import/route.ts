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

export type BulkImportRow = {
  name: string;
  origin?: string;
  supplierName?: string;
  stockKg: number;
  pricePerKg?: number;
  isAllergen?: boolean;
};

// POST /api/admin/ingredients/bulk-stock-import
// Body: JSON array of { name, origin, supplierName, stockKg, pricePerKg, isAllergen }
// Jika bahan baku sudah ada: update stok, harga, dan supplier/asal.
// Jika belum ada: buat bahan baku baru (otomatis ditambahkan ke katalog).
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if ('error' in auth) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  try {
    const body = await req.json();
    const rows: BulkImportRow[] = body.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Data tidak valid atau kosong.' }, { status: 400 });
    }

    const results: Array<{
      name: string;
      status: 'created' | 'updated' | 'invalid';
      message?: string;
    }> = [];

    for (const row of rows) {
      const rawName = typeof row.name === 'string' ? row.name.trim() : '';
      if (!rawName) {
        results.push({ name: '(Tanpa Nama)', status: 'invalid', message: 'Nama bahan baku kosong.' });
        continue;
      }

      const stockKg = Number(row.stockKg);
      if (isNaN(stockKg) || stockKg < 0) {
        results.push({ name: rawName, status: 'invalid', message: 'Sisa stok tidak valid (harus angka >= 0).' });
        continue;
      }

      const pricePerKg = row.pricePerKg !== undefined && !isNaN(Number(row.pricePerKg))
        ? Math.max(0, Number(row.pricePerKg))
        : 0;

      const origin = row.origin && typeof row.origin === 'string' && row.origin.trim()
        ? row.origin.trim()
        : '-';

      const supplierName = row.supplierName && typeof row.supplierName === 'string' && row.supplierName.trim()
        ? row.supplierName.trim()
        : '-';

      try {
        const existing = await prisma.ingredient.findFirst({
          where: { name: { equals: rawName, mode: 'insensitive' } },
        });

        if (existing) {
          const updateData: Record<string, unknown> = {
            stockKg,
          };
          if (pricePerKg > 0 || row.pricePerKg !== undefined) {
            updateData.pricePerKg = pricePerKg;
          }
          if (origin !== '-') {
            updateData.origin = origin;
          }
          if (supplierName !== '-') {
            updateData.supplierName = supplierName;
          }
          if (row.isAllergen !== undefined) {
            updateData.isAllergen = Boolean(row.isAllergen);
          }

          await prisma.ingredient.update({
            where: { id: existing.id },
            data: updateData,
          });

          results.push({
            name: existing.name,
            status: 'updated',
            message: `Stok diperbarui (${stockKg} kg)${pricePerKg > 0 ? `, harga: Rp ${pricePerKg.toLocaleString('id-ID')}` : ''}`,
          });
        } else {
          const created = await prisma.ingredient.create({
            data: {
              name: rawName,
              origin,
              supplierName,
              stockKg,
              pricePerKg,
              isAllergen: Boolean(row.isAllergen),
            },
          });

          results.push({
            name: created.name,
            status: 'created',
            message: `Bahan baku baru ditambahkan (Stok: ${stockKg} kg, Harga: Rp ${pricePerKg.toLocaleString('id-ID')})`,
          });
        }
      } catch (rowErr: any) {
        results.push({
          name: rawName,
          status: 'invalid',
          message: rowErr.message || 'Gagal menyimpan ke database.',
        });
      }
    }

    const createdCount = results.filter((r) => r.status === 'created').length;
    const updatedCount = results.filter((r) => r.status === 'updated').length;
    const invalidCount = results.filter((r) => r.status === 'invalid').length;

    return NextResponse.json({
      summary: {
        createdCount,
        updatedCount,
        notFoundCount: 0,
        invalidCount,
        totalRows: rows.length,
      },
      results,
    });
  } catch (error) {
    console.error('[ADMIN BULK STOCK IMPORT ERROR]', error);
    return NextResponse.json({ error: 'Gagal memproses impor data.' }, { status: 500 });
  }
}
