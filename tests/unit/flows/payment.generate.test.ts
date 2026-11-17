import { NextRequest } from 'next/server';

const mockPrisma = {
  subscription: { findFirst: jest.fn() },
  transaction: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
};
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));

const mockGetSessionUserId = jest.fn();
// Real session module imports ESM-only jose, so mock it fully (mirrors getAuthErrorResponse).
jest.mock('@/lib/session', () => {
  const { NextResponse } = jest.requireActual('next/server');
  return {
    getSessionUserId: (...a: unknown[]) => mockGetSessionUserId(...a),
    getAuthErrorResponse: (e: string) => e === 'CONFIG_MISSING'
      ? NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 })
      : NextResponse.json({ error: 'Not authenticated.' }, { status: 401 }),
  };
});

import { POST } from '@/app/api/transactions/generate/route';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

const START = new Date('2026-11-01T00:00:00Z');

function req(body: unknown = {}) {
  return new NextRequest('http://localhost:3000/api/transactions/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function sub(planType: string) {
  return { id: 's1', startDate: START, status: 'UNPAID', planType, servings: 2 };
}

function snapOk(token = 'snap-tok', redirect_url?: string) {
  fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({ token, redirect_url }) });
}

describe('POST /api/transactions/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MIDTRANS_SERVER_KEY = 'srv-key';
    delete process.env.MIDTRANS_IS_PRODUCTION;
    delete process.env.MIDTRANS_ENABLED_PAYMENTS;
    mockGetSessionUserId.mockResolvedValue({ userId: 'u1' });
    mockPrisma.subscription.findFirst.mockResolvedValue(sub('BULANAN'));
    mockPrisma.transaction.findFirst.mockResolvedValue(null);
    mockPrisma.transaction.create.mockImplementation(async ({ data }) => ({
      ...data, user: { id: 'u1', name: 'Budi', email: 'b@x.id' },
    }));
    mockPrisma.transaction.update.mockImplementation(async ({ where, data }) => ({ id: where.id, ...data }));
    snapOk();
  });

  it('returns 401 when not logged in', async () => {
    mockGetSessionUserId.mockResolvedValue({ error: 'UNAUTHENTICATED' });
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(mockPrisma.transaction.create).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 500 when auth config is missing', async () => {
    mockGetSessionUserId.mockResolvedValue({ error: 'CONFIG_MISSING' });
    expect((await POST(req())).status).toBe(500);
  });

  it('returns 404 when user has no subscription', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue(null);
    const res = await POST(req());
    expect(res.status).toBe(404);
    expect(mockPrisma.transaction.create).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['MINGGUAN', 350000],
    ['BULANAN', 1200000],
    ['TAHUNAN', 12000000],
  ])('charges server price for %s (%i)', async (plan, price) => {
    mockPrisma.subscription.findFirst.mockResolvedValue(sub(plan as string));
    const res = await POST(req());
    expect(res.status).toBe(201);
    expect(mockPrisma.transaction.create.mock.calls[0][0].data).toMatchObject({
      userId: 'u1', amount: price, status: 'PENDING', qrisCode: 'PENDING_SNAP',
    });
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.transaction_details.gross_amount).toBe(price);
    expect(payload.item_details[0].price).toBe(price);
  });

  it('ignores a tampered amount in the request body', async () => {
    const res = await POST(req({ amount: 1, gross_amount: 1, planType: 'MINGGUAN' }));
    expect(res.status).toBe(201);
    expect(mockPrisma.transaction.create.mock.calls[0][0].data.amount).toBe(1200000);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.transaction_details.gross_amount).toBe(1200000);
  });

  it('works with an empty body', async () => {
    const r = new NextRequest('http://localhost:3000/api/transactions/generate', { method: 'POST' });
    expect((await POST(r)).status).toBe(201);
  });

  it('uses the session user id, not one from the body', async () => {
    await POST(req({ userId: 'attacker' }));
    expect(mockPrisma.subscription.findFirst.mock.calls[0][0].where).toEqual({ userId: 'u1' });
    expect(mockPrisma.transaction.create.mock.calls[0][0].data.userId).toBe('u1');
  });

  it('calls sandbox Snap with basic auth and stores the snap token', async () => {
    snapOk('tok-123', 'https://redirect/x');
    const res = await POST(req());
    const json = await res.json();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://app.sandbox.midtrans.com/snap/v1/transactions');
    expect(init.headers.Authorization).toBe('Basic ' + Buffer.from('srv-key:').toString('base64'));
    expect(json.snapToken).toBe('tok-123');
    expect(json.redirectUrl).toBe('https://redirect/x');
    expect(mockPrisma.transaction.update.mock.calls[0][0].data).toEqual({ qrisCode: 'tok-123' });
    const orderId = mockPrisma.transaction.create.mock.calls[0][0].data.id;
    expect(orderId).toMatch(/^ORDER-\d+-[0-9a-f]{8}$/);
    expect(JSON.parse(init.body).transaction_details.order_id).toBe(orderId);
  });

  it('uses production Snap url and builds redirect when missing', async () => {
    process.env.MIDTRANS_IS_PRODUCTION = 'true';
    snapOk('tok-9');
    const json = await (await POST(req())).json();
    expect(fetchMock.mock.calls[0][0]).toBe('https://app.midtrans.com/snap/v1/transactions');
    expect(json.redirectUrl).toBe('https://app.midtrans.com/snap/v2/vtweb/tok-9');
  });

  it('passes enabled_payments from env, trimmed', async () => {
    process.env.MIDTRANS_ENABLED_PAYMENTS = ' gopay , qris ,,';
    await POST(req());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).enabled_payments).toEqual(['gopay', 'qris']);
  });

  it('omits enabled_payments when env is blank', async () => {
    process.env.MIDTRANS_ENABLED_PAYMENTS = ' , ';
    await POST(req());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).enabled_payments).toBeUndefined();
  });

  it('returns 500 without calling Midtrans when server key is empty', async () => {
    process.env.MIDTRANS_SERVER_KEY = '';
    const res = await POST(req());
    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockPrisma.transaction.create).not.toHaveBeenCalled();
  });

  it('returns 500 with Midtrans status_message when Snap fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ status_message: 'Access denied' }) });
    const res = await POST(req());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Access denied');
    expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
  });

  it('returns 500 with fallback message when Snap fails without message', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, json: async () => ({}) });
    expect((await (await POST(req())).json()).error).toContain('502');
  });

  it('returns 500 when Snap response has no token', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({}) });
    const res = await POST(req());
    expect(res.status).toBe(500);
    expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
  });

  it('returns 500 when fetch throws (network down)', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));
    expect((await POST(req())).status).toBe(500);
  });

  it('returns 500 when DB lookup throws', async () => {
    mockPrisma.subscription.findFirst.mockRejectedValue(new Error('db down'));
    expect((await POST(req())).status).toBe(500);
  });

  describe('reuse of latest transaction', () => {
    const pending = {
      id: 'ORDER-old', userId: 'u1', amount: 1200000, status: 'PENDING',
      qrisCode: 'old-tok', createdAt: new Date('2026-11-05T00:00:00Z'),
      user: { id: 'u1', name: 'Budi', email: 'b@x.id' },
    };

    it('reuses a pending transaction with same amount', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue(pending);
      const res = await POST(req());
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.snapToken).toBe('old-tok');
      expect(json.redirectUrl).toBe('https://app.sandbox.midtrans.com/snap/v2/vtweb/old-tok');
      expect(json.transaction.id).toBe('ORDER-old');
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockPrisma.transaction.create).not.toHaveBeenCalled();
    });

    it('reuses even without server key (no Midtrans call needed)', async () => {
      process.env.MIDTRANS_SERVER_KEY = '';
      mockPrisma.transaction.findFirst.mockResolvedValue(pending);
      expect((await POST(req())).status).toBe(200);
    });

    it.each([
      ['FAILED', { status: 'FAILED' }],
      ['COMPLETED', { status: 'COMPLETED' }],
      ['different amount (plan changed)', { amount: 350000 }],
      ['no snap token yet', { qrisCode: 'PENDING_SNAP' }],
      ['created before subscription start', { createdAt: new Date('2026-10-01T00:00:00Z') }],
    ])('does not reuse when %s', async (_n, override) => {
      mockPrisma.transaction.findFirst.mockResolvedValue({ ...pending, ...override });
      const res = await POST(req());
      expect(res.status).toBe(201);
      expect(mockPrisma.transaction.create).toHaveBeenCalledTimes(1);
    });

    it('looks up only the latest transaction of the session user', async () => {
      await POST(req());
      expect(mockPrisma.transaction.findFirst.mock.calls[0][0]).toMatchObject({
        where: { userId: 'u1' }, orderBy: { createdAt: 'desc' },
      });
    });
  });
});
