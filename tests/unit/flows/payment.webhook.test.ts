import crypto from 'crypto';
import { NextRequest } from 'next/server';

const mockPrisma = {
  transaction: { findUnique: jest.fn(), update: jest.fn() },
  transactionLedger: { updateMany: jest.fn() },
  subscription: { updateMany: jest.fn() },
};
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));

const mockLock = jest.fn();
jest.mock('@/controllers/weeklyBoxController', () => ({
  lockCurrentWeeklyBox: (...a: unknown[]) => mockLock(...a),
}));

import { POST } from '@/app/api/webhooks/midtrans/route';

const KEY = 'test-server-key';

function sign(orderId: string, statusCode: string, gross: string, key = KEY) {
  return crypto.createHash('sha512').update(`${orderId}${statusCode}${gross}${key}`).digest('hex');
}

function hook(over: Record<string, unknown> = {}, key = KEY) {
  const base = {
    order_id: 'ORDER-1',
    status_code: '200',
    gross_amount: '1200000.00',
    transaction_status: 'settlement',
    ...over,
  } as Record<string, unknown>;
  if (!('signature_key' in over)) {
    base.signature_key = sign(String(base.order_id), String(base.status_code), String(base.gross_amount), key);
  }
  return new NextRequest('http://localhost/api/webhooks/midtrans', { method: 'POST', body: JSON.stringify(base) });
}

describe('Midtrans webhook (payment flow)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.MIDTRANS_SERVER_KEY = KEY;
    mockPrisma.transaction.findUnique.mockResolvedValue({ amount: 1200000 });
    mockPrisma.transaction.update.mockResolvedValue({ id: 'ORDER-1', userId: 'u1' });
    mockPrisma.transactionLedger.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });
    mockLock.mockResolvedValue({ data: {}, status: 200 });
  });

  it('settlement with matching amount marks COMPLETED, syncs ledger, activates sub, locks box', async () => {
    const res = await POST(hook());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'success' });
    const upd = mockPrisma.transaction.update.mock.calls[0][0];
    expect(upd.where).toEqual({ id: 'ORDER-1' });
    expect(upd.data.status).toBe('COMPLETED');
    expect(upd.data.paidAt).toBeInstanceOf(Date);
    expect(mockPrisma.transactionLedger.updateMany).toHaveBeenCalledWith({
      where: { transactionId: 'ORDER-1' }, data: { status: 'COMPLETED' },
    });
    expect(mockPrisma.subscription.updateMany.mock.calls[0][0].where).toEqual({ userId: 'u1', status: 'UNPAID' });
    expect(mockLock).toHaveBeenCalledWith('u1');
  });

  it('accepts integer gross_amount string too', async () => {
    await POST(hook({ gross_amount: '1200000' }));
    expect(mockPrisma.transaction.update.mock.calls[0][0].data.status).toBe('COMPLETED');
  });

  it('capture + accept marks COMPLETED', async () => {
    await POST(hook({ transaction_status: 'capture', fraud_status: 'accept' }));
    expect(mockPrisma.transaction.update.mock.calls[0][0].data.status).toBe('COMPLETED');
    expect(mockLock).toHaveBeenCalled();
  });

  it('capture + challenge stays PENDING, no activation, no lock', async () => {
    const res = await POST(hook({ transaction_status: 'capture', fraud_status: 'challenge' }));
    expect(res.status).toBe(200);
    const data = mockPrisma.transaction.update.mock.calls[0][0].data;
    expect(data.status).toBe('PENDING');
    expect(data.paidAt).toBeUndefined();
    expect(mockPrisma.subscription.updateMany).not.toHaveBeenCalled();
    expect(mockLock).not.toHaveBeenCalled();
  });

  it.each(['deny', 'expire', 'cancel'])('%s marks FAILED and syncs ledger, no activation', async (st) => {
    await POST(hook({ transaction_status: st, status_code: '202' }));
    expect(mockPrisma.transaction.update.mock.calls[0][0].data).toEqual({ status: 'FAILED' });
    expect(mockPrisma.transactionLedger.updateMany).toHaveBeenCalledWith({
      where: { transactionId: 'ORDER-1' }, data: { status: 'FAILED' },
    });
    expect(mockPrisma.subscription.updateMany).not.toHaveBeenCalled();
    expect(mockLock).not.toHaveBeenCalled();
  });

  it('FAILED is applied even if amount differs (no money moved)', async () => {
    await POST(hook({ transaction_status: 'expire', gross_amount: '1.00' }));
    expect(mockPrisma.transaction.update.mock.calls[0][0].data.status).toBe('FAILED');
  });

  it('pending marks PENDING', async () => {
    await POST(hook({ transaction_status: 'pending', status_code: '201' }));
    expect(mockPrisma.transaction.update.mock.calls[0][0].data.status).toBe('PENDING');
  });

  it.each(['refund', 'partial_refund', 'authorize', 'chargeback', ''])(
    'unknown status "%s" is ignored with 200 (or 400 if empty)', async (st) => {
      const res = await POST(hook({ transaction_status: st }));
      if (st === '') {
        expect(res.status).toBe(400);
      } else {
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ status: 'ignored' });
      }
      expect(mockPrisma.transaction.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
    });

  it('unknown order returns 200 and changes nothing', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue(null);
    const res = await POST(hook({ order_id: 'ORDER-ghost' }));
    expect(res.status).toBe(200);
    expect((await res.json()).error).toBe('Transaction not found.');
    expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
  });

  it.each(['1.00', '350000.00', '1200001.00', '12000000.00', 'abc'])(
    'amount mismatch %s on settlement does not mark paid', async (gross) => {
      const res = await POST(hook({ gross_amount: gross }));
      expect(res.status).toBe(200);
      expect((await res.json()).error).toBe('Amount mismatch.');
      expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
      expect(mockPrisma.subscription.updateMany).not.toHaveBeenCalled();
      expect(mockLock).not.toHaveBeenCalled();
    });

  it('wrong signature returns 403 and never touches DB', async () => {
    const res = await POST(hook({ signature_key: 'deadbeef' }));
    expect(res.status).toBe(403);
    expect(mockPrisma.transaction.findUnique).not.toHaveBeenCalled();
  });

  it('signature made with another key is rejected', async () => {
    expect((await POST(hook({}, 'attacker-key'))).status).toBe(403);
  });

  it('signature for a different amount is rejected (tamper after signing)', async () => {
    const sig = sign('ORDER-1', '200', '1.00');
    const res = await POST(hook({ gross_amount: '1200000.00', signature_key: sig }));
    expect(res.status).toBe(403);
  });

  it('signature with right length but wrong content is rejected', async () => {
    const good = sign('ORDER-1', '200', '1200000.00');
    const bad = (good[0] === 'a' ? 'b' : 'a') + good.slice(1);
    expect((await POST(hook({ signature_key: bad }))).status).toBe(403);
  });

  it('uppercased valid signature is rejected (exact hex compare)', async () => {
    const good = sign('ORDER-1', '200', '1200000.00');
    expect((await POST(hook({ signature_key: good.toUpperCase() }))).status).toBe(403);
  });

  it('empty server key rejects even a signature computed with empty key', async () => {
    process.env.MIDTRANS_SERVER_KEY = '';
    expect((await POST(hook({}, ''))).status).toBe(403);
  });

  it('unset server key rejects', async () => {
    delete process.env.MIDTRANS_SERVER_KEY;
    expect((await POST(hook({}, ''))).status).toBe(403);
  });

  it.each(['order_id', 'status_code', 'gross_amount', 'signature_key', 'transaction_status'])(
    'missing %s returns 400', async (field) => {
      const body: Record<string, unknown> = {
        order_id: 'ORDER-1', status_code: '200', gross_amount: '1200000.00',
        transaction_status: 'settlement', signature_key: sign('ORDER-1', '200', '1200000.00'),
      };
      delete body[field];
      const r = new NextRequest('http://localhost/api/webhooks/midtrans', { method: 'POST', body: JSON.stringify(body) });
      expect((await POST(r)).status).toBe(400);
    });

  it('malformed JSON returns 500', async () => {
    const r = new NextRequest('http://localhost/api/webhooks/midtrans', { method: 'POST', body: '{not json' });
    expect((await POST(r)).status).toBe(500);
  });

  it('auto-lock failure (error result) does not break the webhook', async () => {
    mockLock.mockResolvedValue({ error: 'no box', status: 404 });
    const res = await POST(hook());
    expect(res.status).toBe(200);
    expect(mockPrisma.transaction.update).toHaveBeenCalled();
  });

  it('auto-lock throwing does not break the webhook', async () => {
    mockLock.mockRejectedValue(new Error('boom'));
    const res = await POST(hook());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'success' });
  });

  it('ledger sync failure does not break the webhook', async () => {
    mockPrisma.transactionLedger.updateMany.mockRejectedValue(new Error('ledger down'));
    const res = await POST(hook());
    expect(res.status).toBe(200);
    expect(mockPrisma.subscription.updateMany).toHaveBeenCalled();
  });

  it('subscription already ACTIVE: updateMany count 0, still success and lock attempted', async () => {
    mockPrisma.subscription.updateMany.mockResolvedValue({ count: 0 });
    const res = await POST(hook());
    expect(res.status).toBe(200);
    expect(mockLock).toHaveBeenCalledWith('u1');
  });

  it('DB error on transaction update returns 500 so Midtrans retries', async () => {
    mockPrisma.transaction.update.mockRejectedValue(new Error('db down'));
    expect((await POST(hook())).status).toBe(500);
  });

  // BUG: src/app/api/webhooks/midtrans/route.ts:43-59 never checks the current transaction status.
  // Midtrans notifications can arrive out of order or be replayed (signature stays valid forever);
  // a late 'expire'/'pending' must not downgrade an already COMPLETED (paid) transaction.
  it('does not downgrade an already COMPLETED transaction on a late expire notification', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue({ amount: 1200000, status: 'COMPLETED' });
    await POST(hook({ transaction_status: 'expire', status_code: '407' }));
    expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
  });
});
