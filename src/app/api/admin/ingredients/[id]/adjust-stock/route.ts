import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminRequest as verifyAdmin } from '@/lib/auth';


// PATCH /api/admin/ingredients/[id]/adjust-stock
// Body: { deltaKg: number }  — bisa positif (tambah) atau negatif (kurang)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if ('error' in auth) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { id } = await params;

  try {
    const body = await req.json();
    const deltaKg = Number(body.deltaKg);

    if (!Number.isFinite(deltaKg) || deltaKg === 0) {
      return NextResponse.json({ error: 'deltaKg harus berupa angka bukan nol.' }, { status: 400 });
    }

    // Atomic: the stock check and the change happen in one SQL statement.
    const changed = await prisma.ingredient.updateMany({
      where: { id, stockKg: { gte: Math.max(0, -deltaKg) } },
      data: { stockKg: { increment: deltaKg } },
    });
    if (changed.count === 0) {
      const existing = await prisma.ingredient.findUnique({ where: { id }, select: { stockKg: true } });
      if (!existing) return NextResponse.json({ error: 'Bahan baku tidak ditemukan.' }, { status: 404 });
      return NextResponse.json({ error: `Stok tidak cukup. Stok saat ini: ${existing.stockKg.toFixed(2)} kg.` }, { status: 400 });
    }

    const updated = await prisma.ingredient.findUniqueOrThrow({ where: { id } });
    const newStock = updated.stockKg;
    const existing = { stockKg: newStock - deltaKg };

    // Otomatis catat di IngredientLedger (Read-Only)
    const randomSuffix = crypto.randomUUID().slice(0, 8).toUpperCase(); // unique code column: 4 random digits collided
    const code = `#BB-2026-${String(randomSuffix).padStart(4, '0')}`;
    const refCode = deltaKg > 0 ? `TIK/IN/${randomSuffix}` : `TIK/OUT/${randomSuffix}`;
    const status = deltaKg > 0 ? 'COMPLETED' : 'SIAP_PAKAI';
    const notes = deltaKg > 0
      ? `Penambahan stok presisi oleh Admin (+${deltaKg.toFixed(2)} kg)`
      : `Pengurangan stok presisi oleh Admin (${deltaKg.toFixed(2)} kg)`;

    await prisma.ingredientLedger.create({
      data: {
        ingredientId: id,
        sourceType: 'ADMIN_EDIT',
        status,
        code,
        referenceCode: refCode,
        adminUserId: auth.userId,
        qtyChangeKg: deltaKg,
        stockBeforeKg: existing.stockKg,
        stockAfterKg: newStock,
        notes,
      },
    }).catch((ledgerErr: unknown) => {
      console.warn('[LEDGER WRITE WARNING]', ledgerErr);
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[ADMIN INGREDIENT ADJUST STOCK ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengubah stok.' }, { status: 500 });
  }
}
