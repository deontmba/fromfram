import crypto from 'crypto';
import { NextRequest } from 'next/server';

const mockPrisma = {
  transaction: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  transactionLedger: { updateMany: jest.fn(), create: jest.fn() },
  subscription: { updateMany: jest.fn(), findUnique: jest.fn() },
};
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));

const mockLock = jest.fn();
jest.mock('@/controllers/weeklyBoxController', () => ({
  lockCurrentWeeklyBox: (...a: unknown[]) => mockLock(...a),
}));

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

import {
  resolveTransactionStatus,
  applyTransactionStatus,
  getTransactionStatus,
  verifyMidtransSignature,
} from '@/controllers/transactionController';
import { GET as getStatusRoute } from '@/app/api/transactions/status/[id]/route';
import { GET as listRoute } from '@/app/api/transactions/route';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

const KEY = 'srv-key';
const PENDING_TX = { id: 'ORDER-1', userId: 'u1', amount: 1200000, status: 'PENDING' };

function midtrans(data: Record<string, unknown>, ok = true) {
  fetchMock.mockResolvedValue({ ok, status: ok ? 200 : 404, json: async () => data });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  process.env.MIDTRANS_SERVER_KEY = KEY;
  delete process.env.MIDTRANS_IS_PRODUCTION;
  mockGetSessionUserId.mockResolvedValue({ userId: 'u1' });
  mockPrisma.transaction.findFirst.mockResolvedValue({ ...PENDING_TX });
  mockPrisma.transaction.update.mockImplementation(async ({ where, data }) => ({ ...PENDING_TX, id: where.id, ...data }));
  mockPrisma.transactionLedger.updateMany.mockResolvedValue({ count: 1 });
  mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });
  mockLock.mockResolvedValue({ data: {}, status: 200 });
});

describe('resolveTransactionStatus', () => {
  it.each([
    ['capture', 'accept', 'COMPLETED'],
    ['capture', 'challenge', 'PENDING'],
    ['capture', 'deny', 'PENDING'],
    ['capture', undefined, 'PENDING'],
    ['settlement', undefined, 'COMPLETED'],
    ['settlement', 'challenge', 'COMPLETED'],
    ['pending', undefined, 'PENDING'],
    ['cancel', undefined, 'FAILED'],
    ['deny', undefined, 'FAILED'],
    ['expire', undefined, 'FAILED'],
    ['refund', undefined, null],
    ['SETTLEMENT', undefined, null],
    ['', undefined, null],
  ])('%s / %s -> %s', (ts, fs, expected) => {
    expect(resolveTransactionStatus(ts as string, fs as string | undefined)).toBe(expected);
  });
});

describe('verifyMidtransSignature', () => {
  const sig = (k = KEY) => crypto.createHash('sha512').update(`ORDER-12001200000.00${k}`).digest('hex');

  it('accepts correct signature', () => {
    expect(verifyMidtransSignature('ORDER-1', '200', '1200000.00', sig())).toBe(true);
  });
  it('rejects wrong key', () => {
    expect(verifyMidtransSignature('ORDER-1', '200', '1200000.00', sig('x'))).toBe(false);
  });
  it('rejects changed field', () => {
    expect(verifyMidtransSignature('ORDER-1', '200', '1.00', sig())).toBe(false);
    expect(verifyMidtransSignature('ORDER-2', '200', '1200000.00', sig())).toBe(false);
    expect(verifyMidtransSignature('ORDER-1', '201', '1200000.00', sig())).toBe(false);
  });
  it('rejects different-length signature without throwing', () => {
    expect(verifyMidtransSignature('ORDER-1', '200', '1200000.00', 'abc')).toBe(false);
    expect(verifyMidtransSignature('ORDER-1', '200', '1200000.00', '')).toBe(false);
    expect(verifyMidtransSignature('ORDER-1', '200', '1200000.00', sig() + '00')).toBe(false);
  });
  it('rejects multi-byte string with same char length', () => {
    expect(verifyMidtransSignature('ORDER-1', '200', '1200000.00', 'é'.repeat(128))).toBe(false);
  });
  it('returns false when server key empty or unset', () => {
    process.env.MIDTRANS_SERVER_KEY = '';
    expect(verifyMidtransSignature('ORDER-1', '200', '1200000.00', sig(''))).toBe(false);
    delete process.env.MIDTRANS_SERVER_KEY;
    expect(verifyMidtransSignature('ORDER-1', '200', '1200000.00', sig(''))).toBe(false);
  });
});

describe('applyTransactionStatus', () => {
  it('COMPLETED sets paidAt, syncs ledger, activates only UNPAID subscription, locks box', async () => {
    const tx = await applyTransactionStatus('ORDER-1', 'COMPLETED' as never);
    expect(tx.status).toBe('COMPLETED');
    expect(mockPrisma.transaction.update.mock.calls[0][0].data.paidAt).toBeInstanceOf(Date);
    expect(mockPrisma.transactionLedger.updateMany).toHaveBeenCalledWith({
      where: { transactionId: 'ORDER-1' }, data: { status: 'COMPLETED' },
    });
    const subCall = mockPrisma.subscription.updateMany.mock.calls[0][0];
    expect(subCall.where).toEqual({ userId: 'u1', status: 'UNPAID' });
    expect(subCall.data.status).toBe('ACTIVE');
    expect(subCall.data.startDate).toBeInstanceOf(Date);
    expect(mockLock).toHaveBeenCalledWith('u1');
  });

  it.each(['PENDING', 'FAILED'])('%s does not set paidAt, activate or lock', async (st) => {
    await applyTransactionStatus('ORDER-1', st as never);
    expect(mockPrisma.transaction.update.mock.calls[0][0].data).toEqual({ status: st });
    expect(mockPrisma.transactionLedger.updateMany).toHaveBeenCalled();
    expect(mockPrisma.subscription.updateMany).not.toHaveBeenCalled();
    expect(mockLock).not.toHaveBeenCalled();
  });

  it('creates a ledger row when none exists yet (Snap payments)', async () => {
    mockPrisma.transactionLedger.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'BULANAN', servings: 2 });
    mockPrisma.transactionLedger.create.mockResolvedValue({});
    await applyTransactionStatus('ORDER-1-ab12cd34', 'COMPLETED' as never, 'qris');
    const data = mockPrisma.transactionLedger.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      transactionId: 'ORDER-1-ab12cd34', userId: 'u1', amount: 1200000, status: 'COMPLETED',
      paymentMethod: 'QRIS', referenceCode: 'INV/FF/AB12CD34', metadata: { planType: 'BULANAN', servings: 2 },
    });
    expect(data.code).toMatch(/^TRX-[0-9A-F]{8}$/);
  });

  it('does not create a ledger row when one already exists', async () => {
    await applyTransactionStatus('ORDER-1', 'COMPLETED' as never);
    expect(mockPrisma.transactionLedger.create).not.toHaveBeenCalled();
  });

  it('ledger failure is swallowed', async () => {
    mockPrisma.transactionLedger.updateMany.mockRejectedValue(new Error('x'));
    await expect(applyTransactionStatus('ORDER-1', 'COMPLETED' as never)).resolves.toBeDefined();
  });

  it('lock error result is only logged', async () => {
    mockLock.mockResolvedValue({ error: 'no box', status: 404 });
    await expect(applyTransactionStatus('ORDER-1', 'COMPLETED' as never)).resolves.toBeDefined();
    expect(console.warn).toHaveBeenCalled();
  });

  it('lock throwing is only logged', async () => {
    mockLock.mockRejectedValue(new Error('boom'));
    await expect(applyTransactionStatus('ORDER-1', 'COMPLETED' as never)).resolves.toBeDefined();
  });

  it('transaction update failure propagates', async () => {
    mockPrisma.transaction.update.mockRejectedValue(new Error('db'));
    await expect(applyTransactionStatus('ORDER-1', 'COMPLETED' as never)).rejects.toThrow('db');
  });
});

describe('getTransactionStatus (polling)', () => {
  it('404 when transaction is not owned by user', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(null);
    expect(await getTransactionStatus('u2', 'ORDER-1')).toMatchObject({ status: 404 });
    expect(mockPrisma.transaction.findFirst.mock.calls[0][0].where).toEqual({ id: 'ORDER-1', userId: 'u2' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['COMPLETED', 'FAILED'])('%s transaction is returned without polling', async (st) => {
    mockPrisma.transaction.findFirst.mockResolvedValue({ ...PENDING_TX, status: st });
    const r = await getTransactionStatus('u1', 'ORDER-1');
    expect(r.data?.status).toBe(st);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('PENDING without server key does not poll', async () => {
    process.env.MIDTRANS_SERVER_KEY = '';
    const r = await getTransactionStatus('u1', 'ORDER-1');
    expect(r.data?.status).toBe('PENDING');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('polls sandbox status API with basic auth', async () => {
    midtrans({ transaction_status: 'pending', gross_amount: '1200000.00' });
    await getTransactionStatus('u1', 'ORDER-1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.sandbox.midtrans.com/v2/ORDER-1/status');
    expect(init.headers.Authorization).toBe('Basic ' + Buffer.from(`${KEY}:`).toString('base64'));
  });

  it('polls production API when configured', async () => {
    process.env.MIDTRANS_IS_PRODUCTION = 'true';
    midtrans({ transaction_status: 'pending' });
    await getTransactionStatus('u1', 'ORDER-1');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.midtrans.com/v2/ORDER-1/status');
  });

  it('settlement with matching amount completes and activates', async () => {
    midtrans({ transaction_status: 'settlement', gross_amount: '1200000.00' });
    const r = await getTransactionStatus('u1', 'ORDER-1');
    expect(r.status).toBe(200);
    expect(r.data?.status).toBe('COMPLETED');
    expect(mockPrisma.subscription.updateMany).toHaveBeenCalled();
    expect(mockLock).toHaveBeenCalledWith('u1');
  });

  it('settlement with mismatched amount is NOT completed', async () => {
    midtrans({ transaction_status: 'settlement', gross_amount: '1.00' });
    const r = await getTransactionStatus('u1', 'ORDER-1');
    expect(r.data?.status).toBe('PENDING');
    expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
    expect(mockPrisma.subscription.updateMany).not.toHaveBeenCalled();
  });

  it('settlement with missing gross_amount is NOT completed', async () => {
    midtrans({ transaction_status: 'settlement' });
    await getTransactionStatus('u1', 'ORDER-1');
    expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
  });

  it('capture+accept with matching amount completes', async () => {
    midtrans({ transaction_status: 'capture', fraud_status: 'accept', gross_amount: '1200000.00' });
    expect((await getTransactionStatus('u1', 'ORDER-1')).data?.status).toBe('COMPLETED');
  });

  it('capture+challenge stays PENDING without DB write', async () => {
    midtrans({ transaction_status: 'capture', fraud_status: 'challenge', gross_amount: '1200000.00' });
    await getTransactionStatus('u1', 'ORDER-1');
    expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
  });

  it.each(['deny', 'expire', 'cancel'])('%s marks FAILED regardless of amount', async (st) => {
    midtrans({ transaction_status: st, gross_amount: '1.00' });
    const r = await getTransactionStatus('u1', 'ORDER-1');
    expect(r.data?.status).toBe('FAILED');
    expect(mockPrisma.subscription.updateMany).not.toHaveBeenCalled();
  });

  it('unknown Midtrans status changes nothing', async () => {
    midtrans({ transaction_status: 'refund', gross_amount: '1200000.00' });
    await getTransactionStatus('u1', 'ORDER-1');
    expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
  });

  it('Midtrans 404 (not paid yet) keeps PENDING', async () => {
    midtrans({ status_code: '404' }, false);
    const r = await getTransactionStatus('u1', 'ORDER-1');
    expect(r).toMatchObject({ status: 200, data: { status: 'PENDING' } });
  });

  it('network error while polling still returns DB transaction', async () => {
    fetchMock.mockRejectedValue(new Error('ETIMEDOUT'));
    const r = await getTransactionStatus('u1', 'ORDER-1');
    expect(r).toMatchObject({ status: 200, data: { status: 'PENDING' } });
  });

  it('DB error returns 500', async () => {
    mockPrisma.transaction.findFirst.mockRejectedValue(new Error('db'));
    expect(await getTransactionStatus('u1', 'ORDER-1')).toMatchObject({ status: 500 });
  });
});

describe('GET /api/transactions/status/[id]', () => {
  const call = (id = 'ORDER-1') =>
    getStatusRoute(new NextRequest(`http://localhost/api/transactions/status/${id}`), { params: Promise.resolve({ id }) });

  it('401 when not logged in', async () => {
    mockGetSessionUserId.mockResolvedValue({ error: 'UNAUTHENTICATED' });
    expect((await call()).status).toBe(401);
    expect(mockPrisma.transaction.findFirst).not.toHaveBeenCalled();
  });

  it('404 for another user\'s transaction', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
  });

  it('200 with transaction data and session user scoping', async () => {
    process.env.MIDTRANS_SERVER_KEY = '';
    const res = await call();
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe('ORDER-1');
    expect(mockPrisma.transaction.findFirst.mock.calls[0][0].where).toEqual({ id: 'ORDER-1', userId: 'u1' });
  });
});

describe('GET /api/transactions', () => {
  const call = () => listRoute(new NextRequest('http://localhost/api/transactions'));

  it('401 when not logged in', async () => {
    mockGetSessionUserId.mockResolvedValue({ error: 'UNAUTHENTICATED' });
    expect((await call()).status).toBe(401);
    expect(mockPrisma.transaction.findMany).not.toHaveBeenCalled();
  });

  it('lists only the session user\'s transactions, newest first', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' }, orderBy: { createdAt: 'desc' },
    });
  });

  it('500 on DB error', async () => {
    mockPrisma.transaction.findMany.mockRejectedValue(new Error('db'));
    expect((await call()).status).toBe(500);
  });
});
