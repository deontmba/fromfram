// Env must be set before the controller loads: URL and headers are computed at module load.
process.env.FORECAST_SERVICE_URL = 'http://forecast.test';
process.env.FORECAST_INTERNAL_KEY = 'secret-key';

const mockPrisma: any = {
  user: { findUnique: jest.fn() },
  farmerPurchaseOrder: { findUnique: jest.fn(), updateMany: jest.fn() },
  ingredient: { update: jest.fn() },
  ingredientLedger: { create: jest.fn() },
  $transaction: jest.fn(),
};
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/session', () => ({ getSessionUserId: jest.fn() })); // jose is ESM-only under jest

import { fulfillPO, generateForecast, updateActualUsage } from '@/controllers/forecastingController';

const PO = {
  id: 'po-abcdef123456',
  status: 'CONFIRMED',
  orderedQtyKg: 20,
  pricePerKg: 1000,
  ingredientId: 'ing1',
  farmer: { name: 'Pak Budi Tani' },
  ingredient: { id: 'ing1' },
};

const mockFetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  global.fetch = mockFetch as any;
  mockPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
  mockPrisma.$transaction.mockImplementation((arg: any) =>
    typeof arg === 'function' ? arg(mockPrisma) : Promise.all(arg));
  mockPrisma.farmerPurchaseOrder.findUnique.mockResolvedValue({ ...PO });
  mockPrisma.farmerPurchaseOrder.updateMany.mockResolvedValue({ count: 1 });
  mockPrisma.ingredient.update.mockResolvedValue({ id: 'ing1', stockKg: 30 });
  mockPrisma.ingredientLedger.create.mockImplementation(({ data }: any) => ({ id: 'led', ...data }));
});

describe('fulfillPO', () => {
  it('403 for a non-admin and reads nothing', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'NUTRITIONIST' });
    const r: any = await fulfillPO('u1', PO.id);
    expect(r.status).toBe(403);
    expect(mockPrisma.farmerPurchaseOrder.findUnique).not.toHaveBeenCalled();
  });

  it('404 when the PO is missing', async () => {
    mockPrisma.farmerPurchaseOrder.findUnique.mockResolvedValue(null);
    expect(((await fulfillPO('a', 'nope')) as any).status).toBe(404);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(['FULFILLED', 'CANCELLED'])('400 when status is %s', async (status) => {
    mockPrisma.farmerPurchaseOrder.findUnique.mockResolvedValue({ ...PO, status });
    expect(((await fulfillPO('a', PO.id)) as any).status).toBe(400);
    expect(mockPrisma.ingredient.update).not.toHaveBeenCalled();
  });

  it('claims, increments stock and writes ledger before/after', async () => {
    mockPrisma.farmerPurchaseOrder.findUnique
      .mockResolvedValueOnce({ ...PO })
      .mockResolvedValueOnce({ ...PO, status: 'FULFILLED' });
    const r: any = await fulfillPO('admin1', PO.id);
    expect(r.status).toBe(200);
    expect(mockPrisma.farmerPurchaseOrder.updateMany).toHaveBeenCalledWith({
      where: { id: PO.id, status: { in: ['DRAFT', 'CONFIRMED'] } },
      data: { status: 'FULFILLED', orderedQtyKg: 20, totalPrice: 20000 },
    });
    expect(mockPrisma.ingredient.update).toHaveBeenCalledWith({
      where: { id: 'ing1' }, data: { stockKg: { increment: 20 } },
    });
    expect(r.data.ledger).toMatchObject({
      sourceType: 'PO_FULFILLMENT', purchaseOrderId: PO.id, adminUserId: 'admin1',
      qtyChangeKg: 20, stockBeforeKg: 10, stockAfterKg: 30,
    });
    expect(r.data.ledger.referenceCode).toMatch(/^PO\/PAK-BUDI-TANI\//);
    expect(r.data.purchaseOrder.status).toBe('FULFILLED');
  });

  it('uses the actual received qty when valid', async () => {
    mockPrisma.ingredient.update.mockResolvedValue({ id: 'ing1', stockKg: 15 });
    await fulfillPO('a', PO.id, 5);
    expect(mockPrisma.ingredient.update.mock.calls[0][0].data.stockKg.increment).toBe(5);
    expect(mockPrisma.farmerPurchaseOrder.updateMany.mock.calls[0][0].data.totalPrice).toBe(5000);
  });

  it.each([[0], [-3], [NaN]])('falls back to ordered qty for received=%p', async (q) => {
    await fulfillPO('a', PO.id, q);
    expect(mockPrisma.ingredient.update.mock.calls[0][0].data.stockKg.increment).toBe(20);
  });

  it('409 and no stock added when the claim matches 0 rows (lost race)', async () => {
    mockPrisma.farmerPurchaseOrder.updateMany.mockResolvedValue({ count: 0 });
    const r: any = await fulfillPO('a', PO.id);
    expect(r.status).toBe(409);
    expect(mockPrisma.ingredient.update).not.toHaveBeenCalled();
    expect(mockPrisma.ingredientLedger.create).not.toHaveBeenCalled();
  });

  it('two concurrent fulfills: only one adds stock', async () => {
    let claimed = false;
    mockPrisma.farmerPurchaseOrder.updateMany.mockImplementation(async () => {
      if (claimed) return { count: 0 };
      claimed = true;
      return { count: 1 };
    });
    const results: any[] = await Promise.all([fulfillPO('a', PO.id), fulfillPO('a', PO.id)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(mockPrisma.ingredient.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.ingredientLedger.create).toHaveBeenCalledTimes(1);
  });
});

describe('forecast service calls carry X-Internal-Key', () => {
  const ok = (body: unknown) => ({ ok: true, json: async () => body, text: async () => '' });

  it('generateForecast posts to the configured URL with the key on both calls', async () => {
    mockFetch.mockResolvedValue(ok({ items: [] }));
    const r: any = await generateForecast('a', '2026-11-09');
    expect(r.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0]).toBe('http://forecast.test/forecast');
    expect(mockFetch.mock.calls[1][0]).toBe('http://forecast.test/forecast/save');
    for (const [, init] of mockFetch.mock.calls) {
      expect(init.headers).toEqual({ 'Content-Type': 'application/json', 'X-Internal-Key': 'secret-key' });
    }
  });

  it('updateActualUsage sends the key', async () => {
    mockFetch.mockResolvedValue(ok({ saved: true }));
    await updateActualUsage('a', '2026-11-09', 'ing1', 3);
    expect(mockFetch.mock.calls[0][0]).toBe('http://forecast.test/forecast/actual');
    expect(mockFetch.mock.calls[0][1].headers['X-Internal-Key']).toBe('secret-key');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      week_start_date: '2026-11-09', ingredient_id: 'ing1', actual_qty_kg: 3,
    });
  });

  it('non-admin never reaches the Python service', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'USER' });
    expect(((await generateForecast('u', '2026-11-09')) as any).status).toBe(403);
    expect(((await updateActualUsage('u', 'w', 'i', 1)) as any).status).toBe(403);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('502 when the service returns an error', async () => {
    mockFetch.mockResolvedValue({ ok: false, text: async () => 'boom' });
    const r: any = await generateForecast('a', 'w');
    expect(r.status).toBe(502);
    expect(r.error).toContain('boom');
  });

  it('503 when the service is unreachable', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'));
    expect(((await generateForecast('a', 'w')) as any).status).toBe(503);
    expect(((await updateActualUsage('a', 'w', 'i', 1)) as any).status).toBe(503);
  });

  it('a failed auto-save does not fail the forecast', async () => {
    mockFetch.mockResolvedValueOnce(ok({ x: 1 })).mockRejectedValueOnce(new Error('save down'));
    const r: any = await generateForecast('a', 'w');
    expect(r).toEqual({ data: { x: 1 }, status: 200 });
  });
});

describe('FORECAST_INTERNAL_KEY missing', () => {
  it('sends an empty key header rather than crashing', async () => {
    const saved = process.env.FORECAST_INTERNAL_KEY;
    delete process.env.FORECAST_INTERNAL_KEY;
    let mod: any;
    jest.isolateModules(() => { mod = require('@/controllers/forecastingController'); });
    process.env.FORECAST_INTERNAL_KEY = saved;
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await mod.updateActualUsage('a', 'w', 'i', 1);
    expect(mockFetch.mock.calls[0][1].headers['X-Internal-Key']).toBe('');
  });
});
