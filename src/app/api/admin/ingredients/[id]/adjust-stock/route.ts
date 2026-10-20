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

// PATCH /api/admin/ingredients/[id]/adjust-stock
// Body: { deltaKg: number }  — bisa positif (tambah) atau negatif (kurang)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if ('error' in auth) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { id } = await params;

  try {
    const body = await req.json();
    const deltaKg = Number(body.deltaKg);

    if (isNaN(deltaKg) || deltaKg === 0) {
      return NextResponse.json({ error: 'deltaKg harus berupa angka bukan nol.' }, { status: 400 });
    }

    const existing = await prisma.ingredient.findUnique({ where: { id }, select: { stockKg: true } });
    if (!existing) return NextResponse.json({ error: 'Bahan baku tidak ditemukan.' }, { status: 404 });

    const newStock = existing.stockKg + deltaKg;
    if (newStock < 0) {
      return NextResponse.json({ error: `Stok tidak cukup. Stok saat ini: ${existing.stockKg.toFixed(2)} kg.` }, { status: 400 });
    }

    const updated = await prisma.ingredient.update({
      where: { id },
      data: { stockKg: newStock },
    });

    // Otomatis catat di IngredientLedger (Read-Only)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
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
