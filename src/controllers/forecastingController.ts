import prisma from '@/lib/prisma';
import { verifyRole } from '@/lib/auth';

const getForecastServiceUrl = () => {
  if (process.env.FORECAST_SERVICE_URL) {
    return process.env.FORECAST_SERVICE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/_forecasting`;
  }
  return 'http://localhost:8001';
};

const getForecastHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Internal-Key': process.env.FORECAST_INTERNAL_KEY ?? '',
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const verifyAdmin = (userId: string) => verifyRole(userId, 'ADMIN');

// ---------------------------------------------------------------------------
// Generate Forecast — calls Python ML service
// ---------------------------------------------------------------------------

export async function generateForecast(userId: string, weekStartDate: string) {
  const authError = await verifyAdmin(userId);
  if (authError) return authError;

  const serviceUrl = getForecastServiceUrl();
  const headers = getForecastHeaders();

  try {
    const forecastRes = await fetch(`${serviceUrl}/forecast`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ week_start_date: weekStartDate }),
      signal: AbortSignal.timeout(30000),
    });

    if (!forecastRes.ok) {
      const errText = await forecastRes.text();
      return { error: `Python service error: ${errText}`, status: 502 };
    }

    const forecastData = await forecastRes.json();

    // Auto-save to DB
    await fetch(`${serviceUrl}/forecast/save`, {
      method: 'POST',
      headers,
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

// Helper untuk ekstraksi nama provinsi/wilayah dari string origin atau region
function extractProvince(regionStr?: string | null): string {
  if (!regionStr || regionStr === '-') return 'Wilayah Lainnya';
  const parts = regionStr.split(',').map((p) => p.trim());
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

// ---------------------------------------------------------------------------
// Get Weekly Forecast — ambil dari DB, grouped per Provinsi / Wilayah
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
    orderBy: [
      { farmer: { region: 'asc' } },
      { ingredient: { name: 'asc' } },
    ],
  });

  // Group by Provinsi / Wilayah, pastikan setiap ingredient unik (tidak ada duplikasi baris PO)
  const seenInProvince = new Set<string>();

  const grouped = orders.reduce((acc: Record<string, any>, curr: any) => {
    const rawOrigin = curr.ingredient?.origin || curr.farmer?.region || 'Lainnya';
    const province = extractProvince(rawOrigin);
    const dedupKey = `${province}_${curr.ingredientId}`;

    if (seenInProvince.has(dedupKey)) {
      return acc; // Lewati jika sudah ada baris untuk ingredient yang sama di provinsi ini
    }
    seenInProvince.add(dedupKey);

    if (!acc[province]) {
      acc[province] = {
        regionName: province,
        farmer: {
          id: province,
          name: province,
          region: `Sentra Pengadaan ${province}`,
          commodityType: 'Logistik Terpadu',
        },
        purchaseOrders: [],
      };
    }
    acc[province].purchaseOrders.push(curr);
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

  const serviceUrl = getForecastServiceUrl();
  const headers = getForecastHeaders();

  try {
    const res = await fetch(`${serviceUrl}/forecast/actual`, {
      method: 'PATCH',
      headers,
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

  if (po.status === 'FULFILLED' || po.status === 'CANCELLED') {
    return { error: `Purchase Order ini sudah berstatus ${po.status}.`, status: 400 };
  }

  const receivedQty = actualReceivedQtyKg !== undefined && Number.isFinite(actualReceivedQtyKg) && actualReceivedQtyKg > 0
    ? actualReceivedQtyKg
    : Number(po.orderedQtyKg);

  const randomSuffix = crypto.randomUUID().slice(0, 8).toUpperCase(); // unique code column: 4 random digits collided
  const ledgerCode = `#BB-PO-${String(randomSuffix).padStart(4, '0')}`;
  const refCode = `PO/${po.farmer.name.replace(/\s+/g, '-').toUpperCase()}/${randomSuffix}`;

  const result = await prisma.$transaction(async (tx) => {
    // Conditional update: a second concurrent fulfill matches 0 rows and adds no stock.
    const claimed = await tx.farmerPurchaseOrder.updateMany({
      where: { id: poId, status: { in: ['DRAFT', 'CONFIRMED'] } },
      data: {
        status: 'FULFILLED',
        orderedQtyKg: receivedQty,
        totalPrice: receivedQty * Number(po.pricePerKg),
      },
    });
    if (claimed.count === 0) return null;

    const updatedIngredient = await tx.ingredient.update({
      where: { id: po.ingredientId },
      data: { stockKg: { increment: receivedQty } },
    });
    const updatedPO = await tx.farmerPurchaseOrder.findUnique({ where: { id: poId } });
    const createdLedger = await tx.ingredientLedger.create({
      data: {
        ingredientId: po.ingredientId,
        sourceType: 'PO_FULFILLMENT',
        status: 'COMPLETED',
        code: ledgerCode,
        referenceCode: refCode,
        purchaseOrderId: poId,
        adminUserId: userId,
        qtyChangeKg: receivedQty,
        stockBeforeKg: updatedIngredient.stockKg - receivedQty,
        stockAfterKg: updatedIngredient.stockKg,
        notes: `Penerimaan panen dari ${po.farmer.name} (PO: ${poId.slice(-6)})`,
      },
    });
    return { updatedPO, updatedIngredient, createdLedger };
  });

  if (!result) {
    return { error: 'Purchase Order ini sudah diproses.', status: 409 };
  }
  const { updatedPO, updatedIngredient, createdLedger } = result;

  return {
    data: {
      purchaseOrder: updatedPO,
      ingredient: updatedIngredient,
      ledger: createdLedger,
    },
    status: 200,
  };
}
