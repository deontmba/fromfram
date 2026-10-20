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

// PATCH /api/admin/ingredients/[id]/restock — tambah stok ingredient dari Dashboard Admin
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if ('error' in auth) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { id } = await params;

  try {
    const body = await req.json();
    const addQty = Number(body.addQtyKg);
    const newPrice = body.pricePerKg !== undefined ? Number(body.pricePerKg) : undefined;

    if (isNaN(addQty) || addQty <= 0) {
      return NextResponse.json({ error: 'addQtyKg harus berupa angka positif.' }, { status: 400 });
    }

    const existing = await prisma.ingredient.findUnique({ where: { id }, select: { stockKg: true, name: true } });
    if (!existing) return NextResponse.json({ error: 'Ingredient tidak ditemukan.' }, { status: 404 });

    const newStock = existing.stockKg + addQty;
    const updateData: Record<string, unknown> = {
      stockKg: newStock,
    };
    if (newPrice !== undefined && !isNaN(newPrice) && newPrice >= 0) {
      updateData.pricePerKg = newPrice;
    }

    const updated = await prisma.ingredient.update({ where: { id }, data: updateData });

    // Otomatis catat di IngredientLedger
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `#BB-2026-${String(randomSuffix).padStart(4, '0')}`;
    const refCode = `TIK/IN/${randomSuffix}`;

    await prisma.ingredientLedger.create({
      data: {
        ingredientId: id,
        sourceType: 'ADMIN_EDIT',
        status: 'COMPLETED',
        code,
        referenceCode: refCode,
        adminUserId: auth.userId,
        qtyChangeKg: addQty,
        stockBeforeKg: existing.stockKg,
        stockAfterKg: newStock,
        notes: `Restock bahan baku (+${addQty.toFixed(2)} Kg)`,
      },
    }).catch(err => {
      console.warn('[RESTOCK INGREDIENT LEDGER WARNING]', err);
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[ADMIN INGREDIENT RESTOCK ERROR]', error);
    return NextResponse.json({ error: 'Failed to restock ingredient.' }, { status: 500 });
  }
}
