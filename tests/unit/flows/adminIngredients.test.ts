import { NextRequest } from 'next/server';

const mockPrisma: any = {
  user: { findUnique: jest.fn() },
  ingredient: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  ingredientLedger: { create: jest.fn() },
  recipeIngredient: { count: jest.fn() },
  farmerSupplyItem: { count: jest.fn() },
  farmerPurchaseOrder: { count: jest.fn() },
  $transaction: jest.fn(),
};
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));

const mockGetSession = jest.fn();
jest.mock('@/lib/session', () => ({
  getSessionUserId: (...a: unknown[]) => mockGetSession(...a),
}));

import { GET, POST } from '@/app/api/admin/ingredients/route';
import { PATCH as PATCH_ONE, DELETE } from '@/app/api/admin/ingredients/[id]/route';
import { PATCH as ADJUST } from '@/app/api/admin/ingredients/[id]/adjust-stock/route';
import { PATCH as RESTOCK } from '@/app/api/admin/ingredients/[id]/restock/route';
import { POST as BULK } from '@/app/api/admin/ingredients/bulk-stock-import/route';

const req = (body?: unknown, method = 'POST') =>
  new NextRequest('http://localhost/api/admin/ingredients', {
    method,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
const params = (id = 'ing1') => ({ params: Promise.resolve({ id }) });

function asRole(role: string | null) {
  if (role === null) {
    mockGetSession.mockResolvedValue({ error: 'UNAUTHENTICATED' });
    return;
  }
  mockGetSession.mockResolvedValue({ userId: 'admin1' });
  mockPrisma.user.findUnique.mockResolvedValue({ role });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  asRole('ADMIN');
  mockPrisma.$transaction.mockImplementation((arg: any) =>
    typeof arg === 'function' ? arg(mockPrisma) : Promise.all(arg));
  mockPrisma.ingredientLedger.create.mockResolvedValue({ id: 'led1' });
});

describe('admin ingredient routes: access control', () => {
  const calls: Array<[string, () => Promise<Response>]> = [
    ['GET list', () => GET(req(undefined, 'GET'))],
    ['POST create', () => POST(req({ name: 'Tomat' }))],
    ['PATCH edit', () => PATCH_ONE(req({ name: 'x' }, 'PATCH'), params())],
    ['DELETE', () => DELETE(req(undefined, 'DELETE'), params())],
    ['adjust-stock', () => ADJUST(req({ deltaKg: 1 }, 'PATCH'), params())],
    ['restock', () => RESTOCK(req({ addQtyKg: 1 }, 'PATCH'), params())],
    ['bulk import', () => BULK(req({ rows: [{ name: 'A', stockKg: 1 }] }))],
  ];

  it.each(calls)('%s rejects a logged-out caller with 403 and touches no data', async (_n, call) => {
    asRole(null);
    const res = await call();
    expect(res.status).toBe(403);
    expect(mockPrisma.ingredient.update).not.toHaveBeenCalled();
    expect(mockPrisma.ingredient.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.ingredient.create).not.toHaveBeenCalled();
    expect(mockPrisma.ingredient.delete).not.toHaveBeenCalled();
  });

  it.each(calls)('%s rejects a USER with 403', async (_n, call) => {
    asRole('USER');
    expect((await call()).status).toBe(403);
    expect(mockPrisma.ingredient.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.ingredient.updateMany).not.toHaveBeenCalled();
  });

  it.each(calls)('%s rejects a NUTRITIONIST with 403 (admin only)', async (_n, call) => {
    asRole('NUTRITIONIST');
    expect((await call()).status).toBe(403);
  });

  it('rejects when the session user no longer exists', async () => {
    mockGetSession.mockResolvedValue({ userId: 'ghost' });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    expect((await GET(req(undefined, 'GET'))).status).toBe(403);
  });
});

describe('GET / POST /api/admin/ingredients', () => {
  it('lists ingredients for an admin', async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([{ id: 'a', name: 'Bayam' }]);
    const res = await GET(req(undefined, 'GET'));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toHaveLength(1);
  });

  it.each([[{}], [{ name: '   ' }], [{ name: 42 }]])('400 on bad name %j', async (body) => {
    const res = await POST(req(body));
    expect(res.status).toBe(400);
    expect(mockPrisma.ingredient.create).not.toHaveBeenCalled();
  });

  it('409 on case-insensitive duplicate name', async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue({ id: 'x' });
    const res = await POST(req({ name: ' tomat ' }));
    expect(res.status).toBe(409);
    expect(mockPrisma.ingredient.findFirst).toHaveBeenCalledWith({
      where: { name: { equals: 'tomat', mode: 'insensitive' } },
    });
  });

  it('clamps negative stock and price to 0 and writes a ledger row', async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(null);
    mockPrisma.ingredient.create.mockImplementation(({ data }: any) => ({ id: 'new', ...data }));
    const res = await POST(req({ name: 'Wortel', stockKg: -50, pricePerKg: -1 }));
    expect(res.status).toBe(201);
    const data = mockPrisma.ingredient.create.mock.calls[0][0].data;
    expect(data.stockKg).toBe(0);
    expect(data.pricePerKg).toBe(0);
    expect(mockPrisma.ingredientLedger.create.mock.calls[0][0].data).toMatchObject({
      ingredientId: 'new', adminUserId: 'admin1', qtyChangeKg: 0, stockBeforeKg: 0, stockAfterKg: 0,
    });
  });

  it('maps a P2002 race on create to 409', async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(null);
    mockPrisma.ingredient.create.mockRejectedValue({ code: 'P2002' });
    expect((await POST(req({ name: 'Wortel' }))).status).toBe(409);
  });
});

describe('PATCH / DELETE /api/admin/ingredients/[id]', () => {
  it('404 when the ingredient is missing', async () => {
    mockPrisma.ingredient.findUnique.mockResolvedValue(null);
    expect((await PATCH_ONE(req({ name: 'x' }, 'PATCH'), params())).status).toBe(404);
    expect(mockPrisma.ingredient.update).not.toHaveBeenCalled();
  });

  it('400 on blank name', async () => {
    mockPrisma.ingredient.findUnique.mockResolvedValue({ id: 'ing1', name: 'A', stockKg: 1 });
    expect((await PATCH_ONE(req({ name: '  ' }, 'PATCH'), params())).status).toBe(400);
  });

  it('clamps negative stockKg to 0 and logs the delta', async () => {
    mockPrisma.ingredient.findUnique.mockResolvedValue({ id: 'ing1', name: 'A', stockKg: 10 });
    mockPrisma.ingredient.update.mockResolvedValue({ id: 'ing1', stockKg: 0 });
    const res = await PATCH_ONE(req({ stockKg: -5 }, 'PATCH'), params());
    expect(res.status).toBe(200);
    expect(mockPrisma.ingredient.update.mock.calls[0][0].data.stockKg).toBe(0);
    expect(mockPrisma.ingredientLedger.create.mock.calls[0][0].data).toMatchObject({
      stockBeforeKg: 10, stockAfterKg: 0,
    });
  });

  it('DELETE is blocked (409) while used in a recipe', async () => {
    mockPrisma.recipeIngredient.count.mockResolvedValue(2);
    expect((await DELETE(req(undefined, 'DELETE'), params())).status).toBe(409);
    expect(mockPrisma.ingredient.delete).not.toHaveBeenCalled();
  });

  it('DELETE is blocked (409) while it has purchase orders', async () => {
    mockPrisma.recipeIngredient.count.mockResolvedValue(0);
    mockPrisma.farmerSupplyItem.count.mockResolvedValue(0);
    mockPrisma.farmerPurchaseOrder.count.mockResolvedValue(1);
    expect((await DELETE(req(undefined, 'DELETE'), params())).status).toBe(409);
    expect(mockPrisma.ingredient.delete).not.toHaveBeenCalled();
  });

  it('DELETE maps P2025 to 404', async () => {
    mockPrisma.recipeIngredient.count.mockResolvedValue(0);
    mockPrisma.farmerSupplyItem.count.mockResolvedValue(0);
    mockPrisma.farmerPurchaseOrder.count.mockResolvedValue(0);
    mockPrisma.ingredient.delete.mockRejectedValue({ code: 'P2025' });
    expect((await DELETE(req(undefined, 'DELETE'), params())).status).toBe(404);
  });
});

describe('PATCH adjust-stock', () => {
  const adjust = (deltaKg: unknown) => ADJUST(req({ deltaKg }, 'PATCH'), params());

  it('decrements atomically with a gte guard and logs before/after', async () => {
    mockPrisma.ingredient.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.ingredient.findUniqueOrThrow.mockResolvedValue({ id: 'ing1', stockKg: 7 });
    const res = await adjust(-3);
    expect(res.status).toBe(200);
    expect(mockPrisma.ingredient.updateMany).toHaveBeenCalledWith({
      where: { id: 'ing1', stockKg: { gte: 3 } },
      data: { stockKg: { increment: -3 } },
    });
    expect(mockPrisma.ingredientLedger.create.mock.calls[0][0].data).toMatchObject({
      qtyChangeKg: -3, stockBeforeKg: 10, stockAfterKg: 7, status: 'SIAP_PAKAI', adminUserId: 'admin1',
    });
  });

  it('positive delta uses gte 0 guard', async () => {
    mockPrisma.ingredient.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.ingredient.findUniqueOrThrow.mockResolvedValue({ id: 'ing1', stockKg: 5 });
    await adjust(5);
    expect(mockPrisma.ingredient.updateMany.mock.calls[0][0].where.stockKg).toEqual({ gte: 0 });
  });

  it('400 and no ledger when stock would go negative', async () => {
    mockPrisma.ingredient.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.ingredient.findUnique.mockResolvedValue({ stockKg: 2 });
    const res = await adjust(-5);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('2.00');
    expect(mockPrisma.ingredientLedger.create).not.toHaveBeenCalled();
  });

  it('404 when the ingredient does not exist', async () => {
    mockPrisma.ingredient.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.ingredient.findUnique.mockResolvedValue(null);
    expect((await adjust(-1)).status).toBe(404);
  });

  it.each([[0], ['abc'], [null], ['']])('400 on zero/NaN delta %j', async (d) => {
    expect((await adjust(d)).status).toBe(400);
    expect(mockPrisma.ingredient.updateMany).not.toHaveBeenCalled();
  });

  it('400 when deltaKg is missing', async () => {
    expect((await ADJUST(req({}, 'PATCH'), params())).status).toBe(400);
  });

  // Regression: Number('Infinity') used to pass the isNaN/zero check.
  it('rejects a non-finite delta ("Infinity")', async () => {
    mockPrisma.ingredient.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.ingredient.findUniqueOrThrow.mockResolvedValue({ id: 'ing1', stockKg: Infinity });
    expect((await adjust('Infinity')).status).toBe(400);
  });

  it('500 on malformed JSON body', async () => {
    const bad = new NextRequest('http://localhost/x', { method: 'PATCH', body: '{not json' });
    expect((await ADJUST(bad, params())).status).toBe(500);
  });
});

describe('PATCH restock', () => {
  const restock = (body: unknown) => RESTOCK(req(body, 'PATCH'), params());

  it('uses atomic increment and updates price', async () => {
    mockPrisma.ingredient.update.mockResolvedValue({ id: 'ing1', stockKg: 12 });
    const res = await restock({ addQtyKg: 2, pricePerKg: 9000 });
    expect(res.status).toBe(200);
    expect(mockPrisma.ingredient.update).toHaveBeenCalledWith({
      where: { id: 'ing1' },
      data: { stockKg: { increment: 2 }, pricePerKg: 9000 },
    });
    expect(mockPrisma.ingredientLedger.create.mock.calls[0][0].data).toMatchObject({
      qtyChangeKg: 2, stockBeforeKg: 10, stockAfterKg: 12,
    });
  });

  it('ignores a negative price', async () => {
    mockPrisma.ingredient.update.mockResolvedValue({ id: 'ing1', stockKg: 3 });
    await restock({ addQtyKg: 1, pricePerKg: -5 });
    expect(mockPrisma.ingredient.update.mock.calls[0][0].data).not.toHaveProperty('pricePerKg');
  });

  it.each([[0], [-4], ['x'], [undefined]])('400 on non-positive or NaN qty %j', async (q) => {
    expect((await restock({ addQtyKg: q })).status).toBe(400);
    expect(mockPrisma.ingredient.update).not.toHaveBeenCalled();
  });

  it('404 when ingredient is missing (P2025)', async () => {
    mockPrisma.ingredient.update.mockRejectedValue({ code: 'P2025' });
    expect((await restock({ addQtyKg: 1 })).status).toBe(404);
    expect(mockPrisma.ingredientLedger.create).not.toHaveBeenCalled();
  });

  // Regression: Number('Infinity') > 0 used to be accepted.
  it('rejects a non-finite qty ("Infinity")', async () => {
    mockPrisma.ingredient.update.mockResolvedValue({ id: 'ing1', stockKg: Infinity });
    expect((await restock({ addQtyKg: 'Infinity' })).status).toBe(400);
  });
});

describe('POST bulk-stock-import', () => {
  const bulk = (rows: unknown) => BULK(req({ rows }));

  it.each([[[]], [undefined], ['nope']])('400 on empty/invalid rows %j', async (rows) => {
    expect((await bulk(rows)).status).toBe(400);
  });

  it('updates existing rows in one $transaction with a ledger entry', async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue({ id: 'ing1', name: 'Bayam', stockKg: 10 });
    mockPrisma.ingredient.update.mockReturnValue('UPDATE_OP');
    mockPrisma.ingredientLedger.create.mockReturnValue('LEDGER_OP');
    const res = await bulk([{ name: 'bayam', stockKg: 4, pricePerKg: 1000 }]);
    const json = await res.json();
    expect(json.summary).toMatchObject({ updatedCount: 1, createdCount: 0, invalidCount: 0 });
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(['UPDATE_OP', 'LEDGER_OP']);
    expect(mockPrisma.ingredientLedger.create.mock.calls[0][0].data).toMatchObject({
      ingredientId: 'ing1', qtyChangeKg: -6, stockBeforeKg: 10, stockAfterKg: 4, status: 'SIAP_PAKAI', adminUserId: 'admin1',
    });
  });

  it('creates unknown ingredients', async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(null);
    mockPrisma.ingredient.create.mockImplementation(({ data }: any) => ({ id: 'n', ...data }));
    const json = await (await bulk([{ name: 'Kale', stockKg: 3 }])).json();
    expect(json.summary.createdCount).toBe(1);
    expect(mockPrisma.ingredient.create.mock.calls[0][0].data).toMatchObject({ name: 'Kale', stockKg: 3, origin: '-' });
  });

  it('reports invalid rows (no name, negative, NaN) without writing them', async () => {
    const json = await (await bulk([
      { name: '', stockKg: 1 },
      { name: 'A', stockKg: -1 },
      { name: 'B', stockKg: 'lots' },
    ])).json();
    expect(json.summary).toMatchObject({ invalidCount: 3, createdCount: 0, updatedCount: 0, totalRows: 3 });
    expect(mockPrisma.ingredient.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('a failing row is reported invalid and the rest continue', async () => {
    mockPrisma.ingredient.findFirst
      .mockResolvedValueOnce({ id: 'i1', name: 'A', stockKg: 1 })
      .mockResolvedValueOnce(null);
    mockPrisma.$transaction.mockRejectedValueOnce(new Error('db down'));
    mockPrisma.ingredient.create.mockImplementation(({ data }: any) => ({ id: 'n', ...data }));
    const json = await (await bulk([{ name: 'A', stockKg: 2 }, { name: 'B', stockKg: 2 }])).json();
    expect(json.results[0]).toMatchObject({ status: 'invalid', message: 'db down' });
    expect(json.results[1].status).toBe('created');
  });
});
