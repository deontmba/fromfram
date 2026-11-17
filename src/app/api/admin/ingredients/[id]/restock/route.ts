import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminRequest as verifyAdmin } from '@/lib/auth';


// PATCH /api/admin/ingredients/[id]/restock — tambah stok ingredient dari Dashboard Admin
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if ('error' in auth) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { id } = await params;

  try {
    const body = await req.json();
    const addQty = Number(body.addQtyKg);
    const newPrice = body.pricePerKg !== undefined ? Number(body.pricePerKg) : undefined;

    if (!Number.isFinite(addQty) || addQty <= 0) {
      return NextResponse.json({ error: 'addQtyKg harus berupa angka positif.' }, { status: 400 });
    }

    // Atomic increment so concurrent restocks never overwrite each other.
    const updateData: Record<string, unknown> = {
      stockKg: { increment: addQty },
    };
    if (newPrice !== undefined && Number.isFinite(newPrice) && newPrice >= 0) {
      updateData.pricePerKg = newPrice;
    }

    const updated = await prisma.ingredient.update({ where: { id }, data: updateData }).catch((err: { code?: string }) => {
      if (err?.code === 'P2025') return null;
      throw err;
    });
    if (!updated) return NextResponse.json({ error: 'Ingredient tidak ditemukan.' }, { status: 404 });
    const newStock = updated.stockKg;

    // Otomatis catat di IngredientLedger
    const randomSuffix = crypto.randomUUID().slice(0, 8).toUpperCase(); // unique code column: 4 random digits collided
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
        stockBeforeKg: newStock - addQty,
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
