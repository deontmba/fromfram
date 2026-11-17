import { NextRequest } from 'next/server';

const mockTx = {
  weeklyBox: { updateMany: jest.fn(), findUnique: jest.fn() },
  delivery: { createMany: jest.fn() },
};
const mockPrisma = {
  subscription: { findUnique: jest.fn() },
  weeklyBox: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  address: { findFirst: jest.fn() },
  addressSchedule: { findMany: jest.fn() },
  $transaction: jest.fn(),
};
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));

const mockRefresh = jest.fn();
jest.mock('@/controllers/subscriptionController', () => ({
  refreshSubscriptionStatus: (...a: unknown[]) => mockRefresh(...a),
}));

const mockGetSession = jest.fn();
jest.mock('@/lib/session', () => ({
  getSessionUserId: (...a: unknown[]) => mockGetSession(...a),
  getAuthErrorResponse: () =>
    require('next/server').NextResponse.json({ error: 'Not authenticated.' }, { status: 401 }),
}));

import {
  lockCurrentWeeklyBox,
  skipWeeklyBox,
  getCurrentWeeklyBox,
  getAllWeeklyBoxes,
} from '@/controllers/weeklyBoxController';
import { atJakartaTime, addDays } from '@/lib/week';
import { PATCH as lockRoute } from '@/app/api/weekly-boxes/current/lock/route';
import { GET as currentRoute } from '@/app/api/weekly-boxes/current/route';
import { GET as listRoute } from '@/app/api/weekly-boxes/route';
import { PATCH as skipRoute } from '@/app/api/weekly-boxes/[id]/skip/route';

const USER = 'user-1';
const MON_WIB = new Date('2026-11-08T17:00:00Z'); // Monday 00:00 WIB
const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];

function box(over: Record<string, unknown> = {}) {
  return {
    id: 'box-1',
    userId: USER,
    status: 'PENDING_SELECTION',
    weekStartDate: MON_WIB,
    selectionDeadline: new Date(Date.now() + 86_400_000),
    mealSelections: [{ dayOfWeek: 'SENIN', mealType: 'LUNCH' }],
    ...over,
  };
}

// Simulated DB row so a second lock sees the box already LOCKED.
let boxStatus: string;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  boxStatus = 'PENDING_SELECTION';
  mockRefresh.mockResolvedValue(undefined);
  mockPrisma.subscription.findUnique.mockResolvedValue({ status: 'ACTIVE' });
  mockPrisma.weeklyBox.findFirst.mockResolvedValue(box());
  mockPrisma.address.findFirst.mockResolvedValue({ id: 'addr-default' });
  mockPrisma.addressSchedule.findMany.mockResolvedValue([]);
  mockPrisma.$transaction.mockImplementation((fn: unknown) =>
    typeof fn === 'function' ? fn(mockTx) : Promise.all(fn as Promise<unknown>[]),
  );
  mockTx.weeklyBox.updateMany.mockImplementation(() => {
    if (boxStatus !== 'PENDING_SELECTION') return Promise.resolve({ count: 0 });
    boxStatus = 'LOCKED';
    return Promise.resolve({ count: 1 });
  });
  mockTx.weeklyBox.findUnique.mockImplementation(() => Promise.resolve(box({ status: boxStatus })));
  mockTx.delivery.createMany.mockResolvedValue({ count: 1 });
  mockGetSession.mockResolvedValue({ userId: USER });
});

const deliveries = () => mockTx.delivery.createMany.mock.calls[0][0].data;

describe('week helpers', () => {
  it('atJakartaTime on UTC midnight Monday gives 11:30 WIB that Monday', () => {
    expect(atJakartaTime(new Date('2026-11-09T00:00:00Z'), 11, 30).toISOString()).toBe('2026-11-09T04:30:00.000Z');
  });
  it('atJakartaTime on Monday 00:00 WIB gives the same instant', () => {
    expect(atJakartaTime(new Date('2026-11-08T17:00:00Z'), 11, 30).toISOString()).toBe('2026-11-09T04:30:00.000Z');
  });
  it('atJakartaTime at 23:59 WIB stays on the same Jakarta day', () => {
    expect(atJakartaTime(new Date('2026-11-09T16:59:00Z'), 17, 30).toISOString()).toBe('2026-11-09T10:30:00.000Z');
  });
  it('atJakartaTime defaults minutes to 0 and clears seconds/ms', () => {
    expect(atJakartaTime(new Date('2026-11-09T03:12:45.678Z'), 8).toISOString()).toBe('2026-11-09T01:00:00.000Z');
  });
  it('addDays adds whole 24h days', () => {
    expect(addDays(MON_WIB, 6).toISOString()).toBe('2026-11-14T17:00:00.000Z');
    expect(addDays(MON_WIB, 0).getTime()).toBe(MON_WIB.getTime());
    expect(addDays(MON_WIB, -1).toISOString()).toBe('2026-11-07T17:00:00.000Z');
  });
  it('addDays does not mutate its input', () => {
    const d = new Date(MON_WIB);
    addDays(d, 3);
    expect(d.getTime()).toBe(MON_WIB.getTime());
  });
});

describe('lockCurrentWeeklyBox: payment gate', () => {
  it.each([['UNPAID'], ['PAUSED'], ['CANCELLED'], ['EXPIRED']])('returns 402 for %s subscription', async (status) => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ status });
    const res = await lockCurrentWeeklyBox(USER);
    expect(res.status).toBe(402);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockTx.delivery.createMany).not.toHaveBeenCalled();
  });

  it('returns 402 when there is no subscription', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    expect((await lockCurrentWeeklyBox(USER)).status).toBe(402);
    expect(mockTx.delivery.createMany).not.toHaveBeenCalled();
  });

  it('refreshes the subscription before checking status', async () => {
    await lockCurrentWeeklyBox(USER);
    expect(mockRefresh).toHaveBeenCalledWith(USER);
    expect(mockRefresh.mock.invocationCallOrder[0]).toBeLessThan(
      mockPrisma.subscription.findUnique.mock.invocationCallOrder[0],
    );
  });

  it('returns 402 when refresh expired the subscription', async () => {
    mockRefresh.mockImplementation(async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ status: 'EXPIRED' });
    });
    expect((await lockCurrentWeeklyBox(USER)).status).toBe(402);
  });
});

describe('lockCurrentWeeklyBox: box and address checks', () => {
  it('returns 404 when the user has no box', async () => {
    mockPrisma.weeklyBox.findFirst.mockResolvedValue(null);
    expect((await lockCurrentWeeklyBox(USER)).status).toBe(404);
  });

  it.each(['LOCKED', 'COMPLETED'])('returns 200 already finalized for %s box without deliveries', async (status) => {
    mockPrisma.weeklyBox.findFirst.mockImplementation(({ where }: { where: { status?: string } }) =>
      Promise.resolve(where.status ? null : box({ status })),
    );
    const res = await lockCurrentWeeklyBox(USER);
    expect(res.status).toBe(200);
    expect(res.data?.message).toBe('Weekly box already finalized.');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns 400 for a SKIPPED box', async () => {
    mockPrisma.weeklyBox.findFirst.mockImplementation(({ where }: { where: { status?: string } }) =>
      Promise.resolve(where.status ? null : box({ status: 'SKIPPED' })),
    );
    const res = await lockCurrentWeeklyBox(USER);
    expect(res.status).toBe(400);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('prefers the pending box over the latest box', async () => {
    mockPrisma.weeklyBox.findFirst.mockImplementation(({ where }: { where: { status?: string } }) =>
      Promise.resolve(where.status ? box({ id: 'pending' }) : box({ id: 'latest', status: 'LOCKED' })),
    );
    await lockCurrentWeeklyBox(USER);
    expect(mockTx.weeklyBox.updateMany).toHaveBeenCalledWith({
      where: { id: 'pending', status: 'PENDING_SELECTION' },
      data: { status: 'LOCKED' },
    });
  });

  it('returns 400 when the user has no address', async () => {
    mockPrisma.address.findFirst.mockResolvedValue(null);
    const res = await lockCurrentWeeklyBox(USER);
    expect(res.status).toBe(400);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('falls back to any address when there is no default', async () => {
    mockPrisma.address.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'addr-any' });
    await lockCurrentWeeklyBox(USER);
    expect(mockPrisma.address.findFirst).toHaveBeenNthCalledWith(1, { where: { userId: USER, isDefault: true } });
    expect(deliveries()[0].addressId).toBe('addr-any');
  });
});

describe('lockCurrentWeeklyBox: deliveries', () => {
  it('locks and creates deliveries for each selection', async () => {
    const res = await lockCurrentWeeklyBox(USER);
    expect(res.status).toBe(200);
    expect(res.data?.message).toBe('Weekly box berhasil dikunci.');
    expect(deliveries()).toEqual([
      {
        userId: USER,
        weeklyBoxId: 'box-1',
        addressId: 'addr-default',
        deliveryDate: new Date('2026-11-09T04:30:00Z'),
        mealType: 'LUNCH',
        status: 'PREPARING',
      },
    ]);
  });

  it('double lock creates deliveries only once', async () => {
    const first = await lockCurrentWeeklyBox(USER);
    const second = await lockCurrentWeeklyBox(USER);
    expect(first.data?.message).toBe('Weekly box berhasil dikunci.');
    expect(second.status).toBe(200);
    expect(second.data?.message).toBe('Weekly box already finalized.');
    expect(mockTx.delivery.createMany).toHaveBeenCalledTimes(1);
  });

  it('concurrent locks create deliveries only once', async () => {
    const [a, b] = await Promise.all([lockCurrentWeeklyBox(USER), lockCurrentWeeklyBox(USER)]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(mockTx.delivery.createMany).toHaveBeenCalledTimes(1);
  });

  it('no selections: locks but creates no deliveries', async () => {
    mockPrisma.weeklyBox.findFirst.mockResolvedValue(box({ mealSelections: [] }));
    const res = await lockCurrentWeeklyBox(USER);
    expect(res.data?.message).toBe('Weekly box berhasil dikunci.');
    expect(mockTx.delivery.createMany).not.toHaveBeenCalled();
  });

  it('uses the scheduled address for a matching day+meal, default otherwise', async () => {
    mockPrisma.addressSchedule.findMany.mockResolvedValue([
      { dayOfWeek: 'SENIN', mealType: 'DINNER', addressId: 'addr-office' },
      { dayOfWeek: 'RABU', mealType: 'LUNCH', addressId: 'addr-campus' },
    ]);
    mockPrisma.weeklyBox.findFirst.mockResolvedValue(
      box({
        mealSelections: [
          { dayOfWeek: 'SENIN', mealType: 'LUNCH' },
          { dayOfWeek: 'SENIN', mealType: 'DINNER' },
          { dayOfWeek: 'RABU', mealType: 'LUNCH' },
          { dayOfWeek: 'RABU', mealType: 'DINNER' },
        ],
      }),
    );
    await lockCurrentWeeklyBox(USER);
    expect(deliveries().map((d: { addressId: string }) => d.addressId)).toEqual([
      'addr-default',
      'addr-office',
      'addr-campus',
      'addr-default',
    ]);
  });

  const cases = DAYS.flatMap((day, i) => [
    [day, 'LUNCH', `2026-11-${String(9 + i).padStart(2, '0')}T04:30:00.000Z`],
    [day, 'DINNER', `2026-11-${String(9 + i).padStart(2, '0')}T10:30:00.000Z`],
  ]);

  it.each(cases)('%s %s delivers at %s (weekStart = Mon 00:00 WIB)', async (day, mealType, iso) => {
    mockPrisma.weeklyBox.findFirst.mockResolvedValue(box({ mealSelections: [{ dayOfWeek: day, mealType }] }));
    await lockCurrentWeeklyBox(USER);
    expect(deliveries()[0].deliveryDate.toISOString()).toBe(iso);
    expect(deliveries()[0].mealType).toBe(mealType);
  });

  it.each(cases)('%s %s delivers at %s (weekStart = Mon 00:00 UTC)', async (day, mealType, iso) => {
    mockPrisma.weeklyBox.findFirst.mockResolvedValue(
      box({ weekStartDate: new Date('2026-11-09T00:00:00Z'), mealSelections: [{ dayOfWeek: day, mealType }] }),
    );
    await lockCurrentWeeklyBox(USER);
    expect(deliveries()[0].deliveryDate.toISOString()).toBe(iso);
  });
});

describe('skipWeeklyBox', () => {
  beforeEach(() => {
    mockPrisma.weeklyBox.findUnique.mockResolvedValue(box());
    mockPrisma.weeklyBox.updateMany.mockResolvedValue({ count: 1 });
  });

  it('skips a pending box with a conditional update', async () => {
    const res = await skipWeeklyBox(USER, 'box-1');
    expect(res.status).toBe(200);
    expect(mockPrisma.weeklyBox.updateMany).toHaveBeenCalledWith({
      where: { id: 'box-1', status: 'PENDING_SELECTION' },
      data: { status: 'SKIPPED' },
    });
  });

  it('409 when a lock claimed the box first', async () => {
    mockPrisma.weeklyBox.updateMany.mockResolvedValue({ count: 0 });
    expect((await skipWeeklyBox(USER, 'box-1')).status).toBe(409);
  });

  it('400 after the selection deadline', async () => {
    mockPrisma.weeklyBox.findUnique.mockResolvedValue(box({ selectionDeadline: new Date('2020-01-01') }));
    expect((await skipWeeklyBox(USER, 'box-1')).status).toBe(400);
    expect(mockPrisma.weeklyBox.updateMany).not.toHaveBeenCalled();
  });

  it('404 when box missing', async () => {
    mockPrisma.weeklyBox.findUnique.mockResolvedValue(null);
    expect((await skipWeeklyBox(USER, 'box-1')).status).toBe(404);
  });

  it('403 when box belongs to another user', async () => {
    mockPrisma.weeklyBox.findUnique.mockResolvedValue(box({ userId: 'other' }));
    expect((await skipWeeklyBox(USER, 'box-1')).status).toBe(403);
    expect(mockPrisma.weeklyBox.updateMany).not.toHaveBeenCalled();
  });

  it.each(['LOCKED', 'COMPLETED', 'SKIPPED'])('400 for %s box', async (status) => {
    mockPrisma.weeklyBox.findUnique.mockResolvedValue(box({ status }));
    expect((await skipWeeklyBox(USER, 'box-1')).status).toBe(400);
    expect(mockPrisma.weeklyBox.updateMany).not.toHaveBeenCalled();
  });
});

describe('getCurrentWeeklyBox / getAllWeeklyBoxes', () => {
  it('404 when no current or upcoming box', async () => {
    mockPrisma.weeklyBox.findFirst.mockResolvedValue(null);
    expect((await getCurrentWeeklyBox(USER)).status).toBe(404);
  });

  it('prefers the current-week box', async () => {
    mockPrisma.weeklyBox.findFirst
      .mockResolvedValueOnce(box({ id: 'current' }))
      .mockResolvedValueOnce(box({ id: 'next' }));
    const res = await getCurrentWeeklyBox(USER);
    expect(res.data?.id).toBe('current');
    expect(res.data?.isDeadlinePassed).toBe(false);
  });

  it('falls back to the next box and flags a passed deadline', async () => {
    mockPrisma.weeklyBox.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(box({ id: 'next', selectionDeadline: new Date('2020-01-01') }));
    const res = await getCurrentWeeklyBox(USER);
    expect(res.data?.id).toBe('next');
    expect(res.data?.isDeadlinePassed).toBe(true);
  });

  it('getAllWeeklyBoxes scopes to the user', async () => {
    mockPrisma.weeklyBox.findMany.mockResolvedValue([box()]);
    const res = await getAllWeeklyBoxes(USER);
    expect(res.status).toBe(200);
    expect(mockPrisma.weeklyBox.findMany.mock.calls[0][0].where).toEqual({ userId: USER });
  });
});

describe('weekly-boxes routes', () => {
  const r = (path: string, method = 'GET') => new NextRequest(`http://localhost${path}`, { method });

  it('all routes return 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue({ error: 'UNAUTHENTICATED' });
    expect((await lockRoute(r('/api/weekly-boxes/current/lock', 'PATCH'))).status).toBe(401);
    expect((await currentRoute(r('/api/weekly-boxes/current'))).status).toBe(401);
    expect((await listRoute(r('/api/weekly-boxes'))).status).toBe(401);
    expect(
      (await skipRoute(r('/api/weekly-boxes/box-1/skip', 'PATCH'), { params: Promise.resolve({ id: 'box-1' }) }))
        .status,
    ).toBe(401);
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('lock route returns 402 for an unpaid subscription', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ status: 'UNPAID' });
    const res = await lockRoute(r('/api/weekly-boxes/current/lock', 'PATCH'));
    expect(res.status).toBe(402);
    expect(mockTx.delivery.createMany).not.toHaveBeenCalled();
  });

  it('lock route locks for an active subscription', async () => {
    const res = await lockRoute(r('/api/weekly-boxes/current/lock', 'PATCH'));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toBe('Weekly box berhasil dikunci.');
  });

  it('lock route returns 500 when the controller throws', async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error('db'));
    expect((await lockRoute(r('/api/weekly-boxes/current/lock', 'PATCH'))).status).toBe(500);
  });

  it('skip route returns 403 for another user box', async () => {
    mockPrisma.weeklyBox.findUnique.mockResolvedValue(box({ userId: 'other' }));
    const res = await skipRoute(r('/api/weekly-boxes/box-1/skip', 'PATCH'), {
      params: Promise.resolve({ id: 'box-1' }),
    });
    expect(res.status).toBe(403);
  });

  it('current route returns 404 when none', async () => {
    mockPrisma.weeklyBox.findFirst.mockResolvedValue(null);
    expect((await currentRoute(r('/api/weekly-boxes/current'))).status).toBe(404);
  });

  it('list route returns boxes', async () => {
    mockPrisma.weeklyBox.findMany.mockResolvedValue([{ id: 'b' }]);
    const res = await listRoute(r('/api/weekly-boxes'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 'b' }]);
  });
});
