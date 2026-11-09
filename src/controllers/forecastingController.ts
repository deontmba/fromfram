import prisma from '@/lib/prisma';

const getForecastServiceUrl = () => {
  if (process.env.FORECAST_SERVICE_URL) {
    return process.env.FORECAST_SERVICE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/_forecasting`;
  }
  return 'http://localhost:8001';
};

const FORECAST_SERVICE_URL = getForecastServiceUrl();

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function verifyAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user || user.role !== 'ADMIN') {
    return { error: 'Forbidden. Admin access required.', status: 403 };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Generate Forecast — calls Python ML service
// ---------------------------------------------------------------------------

export async function generateForecast(userId: string, weekStartDate: string) {
  const authError = await verifyAdmin(userId);
  if (authError) return authError;

  try {
    const forecastRes = await fetch(`${FORECAST_SERVICE_URL}/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_start_date: weekStartDate }),
      signal: AbortSignal.timeout(30000),
    });

    if (!forecastRes.ok) {
      const errText = await forecastRes.text();
      return { error: `Python service error: ${errText}`, status: 502 };
    }

    const forecastData = await forecastRes.json();

    // Auto-save to DB
    await fetch(`${FORECAST_SERVICE_URL}/forecast/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forecastData),
      signal: AbortSignal.timeout(30000),
    }).catch(() => {
      // Non-fatal: log saja jika save gagal
      console.warn('[FORECAST] Auto-save to DB failed, continuing...');
    });

    return { data: forecastData, status: 200 };
  } catch (err: unknown) {
    const e = err as any;
    const isConnRefused = 
      e?.code === 'ECONNREFUSED' || 
      e?.cause?.code === 'ECONNREFUSED' ||
      e?.message?.includes('fetch failed');

    if (e?.name === 'TimeoutError' || isConnRefused) {
      return {
        error: 'Python Forecasting Service tidak dapat dihubungi. Pastikan service Python sudah dijalankan (port 8001).',
        status: 503,
      };
    }
    return { error: e?.message ?? 'Gagal generate forecast', status: 500 };
  }
}

// ---------------------------------------------------------------------------
// Get Weekly Forecast — ambil dari DB, grouped per farmer
// ---------------------------------------------------------------------------

export async function getWeeklyForecast(userId: string, weekStartDate: string) {
  const authError = await verifyAdmin(userId);
  if (authError) return authError;

  // Guard: model belum ada jika prisma generate belum dijalankan
  if (!(prisma as any).farmerPurchaseOrder) {
    return { data: [], status: 200 };
  }

  const orders = await (prisma as any).farmerPurchaseOrder.findMany({
    where: { weekStartDate: new Date(weekStartDate) },
    include: {
      farmer: true,
      ingredient: true,
    },
    orderBy: {
      farmer: { name: 'asc' },
    },
  });

  // Group by farmerId
  const grouped = orders.reduce((acc: Record<string, any>, curr: any) => {
    if (!acc[curr.farmerId]) {
      acc[curr.farmerId] = {
        farmer: curr.farmer,
        purchaseOrders: [],
      };
    }
    acc[curr.farmerId].purchaseOrders.push(curr);
    return acc;
  }, {});

  return { data: Object.values(grouped), status: 200 };
}

// ---------------------------------------------------------------------------
// Confirm single PO
// ---------------------------------------------------------------------------

export async function confirmPO(userId: string, poId: string, orderedQtyKg?: number) {
  const authError = await verifyAdmin(userId);
  if (authError) return authError;

  const existing = await (prisma as any).farmerPurchaseOrder.findUnique({ where: { id: poId } });
  if (!existing) return { error: `Purchase Order dengan ID ${poId} tidak ditemukan.`, status: 404 };

  const finalQty = orderedQtyKg !== undefined ? orderedQtyKg : Number(existing.orderedQtyKg);
  const finalPrice = finalQty * Number(existing.pricePerKg);

  const updated = await (prisma as any).farmerPurchaseOrder.update({
    where: { id: poId },
    data: {
      status: 'CONFIRMED' as const,
      confirmedAt: new Date(),
      orderedQtyKg: finalQty,
      totalPrice: finalPrice,
    },
  });

  return { data: updated, status: 200 };
}

// ---------------------------------------------------------------------------
// Confirm All DRAFT POs for a given week
// ---------------------------------------------------------------------------

export async function confirmAllPO(userId: string, weekStartDate: string) {
  const authError = await verifyAdmin(userId);
  if (authError) return authError;

  const result = await (prisma as any).farmerPurchaseOrder.updateMany({
    where: {
      weekStartDate: new Date(weekStartDate),
      status: 'DRAFT' as const,
    },
    data: {
      status: 'CONFIRMED' as const,
      confirmedAt: new Date(),
    },
  });

  return { data: { updatedCount: result.count }, status: 200 };
}

// ---------------------------------------------------------------------------
// Cancel single PO
// ---------------------------------------------------------------------------

export async function cancelPO(userId: string, poId: string) {
  const authError = await verifyAdmin(userId);
  if (authError) return authError;

  const existing = await (prisma as any).farmerPurchaseOrder.findUnique({ where: { id: poId } });
  if (!existing) return { error: `Purchase Order dengan ID ${poId} tidak ditemukan.`, status: 404 };

  const updated = await (prisma as any).farmerPurchaseOrder.update({
    where: { id: poId },
    data: { status: 'CANCELLED' as const },
  });

  return { data: updated, status: 200 };
}

// ---------------------------------------------------------------------------
// Update actual usage — proxies to Python service
// ---------------------------------------------------------------------------

export async function updateActualUsage(
  userId: string,
  weekStartDate: string,
  ingredientId: string,
  actualQtyKg: number,
) {
  const authError = await verifyAdmin(userId);
  if (authError) return authError;

  try {
    const res = await fetch(`${FORECAST_SERVICE_URL}/forecast/actual`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        week_start_date: weekStartDate,
        ingredient_id: ingredientId,
        actual_qty_kg: actualQtyKg,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { error: `Python service error: ${errText}`, status: 502 };
    }

    const data = await res.json();
    return { data, status: 200 };
  } catch {
    return { error: 'Python Forecasting Service tidak dapat dihubungi.', status: 503 };
  }
}

// ---------------------------------------------------------------------------
// Fulfill PO (Penerimaan Panen) — Tambah Stok & Catat Otomatis ke IngredientLedger
// ---------------------------------------------------------------------------

export async function fulfillPO(
  userId: string,
  poId: string,
  actualReceivedQtyKg?: number
) {
  const authError = await verifyAdmin(userId);
  if (authError) return authError;

  const po = await prisma.farmerPurchaseOrder.findUnique({
    where: { id: poId },
    include: {
      ingredient: true,
      farmer: true,
    },
  });

  if (!po) {
    return { error: `Purchase Order dengan ID ${poId} tidak ditemukan.`, status: 404 };
  }

  if (po.status === 'FULFILLED') {
    return { error: 'Purchase Order ini sudah berstatus FULFILLED.', status: 400 };
  }

  const receivedQty = actualReceivedQtyKg !== undefined && !isNaN(actualReceivedQtyKg) && actualReceivedQtyKg > 0
    ? actualReceivedQtyKg
    : Number(po.orderedQtyKg);

  const stockBefore = po.ingredient.stockKg || 0;
  const stockAfter = stockBefore + receivedQty;

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const ledgerCode = `#BB-PO-${String(randomSuffix).padStart(4, '0')}`;
  const refCode = `PO/${po.farmer.name.replace(/\s+/g, '-').toUpperCase()}/${randomSuffix}`;

  const [updatedPO, updatedIngredient, createdLedger] = await prisma.$transaction([
    prisma.farmerPurchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'FULFILLED',
        orderedQtyKg: receivedQty,
        totalPrice: receivedQty * Number(po.pricePerKg),
      },
    }),
    prisma.ingredient.update({
      where: { id: po.ingredientId },
      data: {
        stockKg: stockAfter,
      },
    }),
    prisma.ingredientLedger.create({
      data: {
        ingredientId: po.ingredientId,
        sourceType: 'PO_FULFILLMENT',
        status: 'COMPLETED',
        code: ledgerCode,
        referenceCode: refCode,
        purchaseOrderId: poId,
        adminUserId: userId,
        qtyChangeKg: receivedQty,
        stockBeforeKg: stockBefore,
        stockAfterKg: stockAfter,
        notes: `Penerimaan panen dari ${po.farmer.name} (PO: ${poId.slice(-6)})`,
      },
    }),
  ]);

  return {
    data: {
      purchaseOrder: updatedPO,
      ingredient: updatedIngredient,
      ledger: createdLedger,
    },
    status: 200,
  };
}
