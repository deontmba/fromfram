/**
 * Subscription lifecycle flows against an in-memory fake of the Prisma calls the controller makes.
 * No real database: '@/lib/prisma' is mocked.
 */
type Row = Record<string, any>;

const db: { subs: Row[]; users: Row[]; goals: Row[]; boxes: Row[]; menus: Row[] } = {
  subs: [],
  users: [],
  goals: [],
  boxes: [],
  menus: [],
};

function cond(val: any, c: any): boolean {
  if (c && typeof c === 'object' && !(c instanceof Date)) {
    if ('not' in c && val === c.not) return false;
    if ('lte' in c && (val == null || val > c.lte)) return false;
    if ('gte' in c && (val == null || val < c.gte)) return false;
    if ('lt' in c && (val == null || val >= c.lt)) return false;
    if ('in' in c && !c.in.includes(val)) return false;
    return true;
  }
  return val === c;
}
function match(row: Row, where: Row = {}) {
  return Object.entries(where).every(([k, c]) => cond(row[k], c));
}
function clone<T>(v: T): T {
  return v == null ? v : structuredClone(v);
}
function finder(table: keyof typeof db) {
  return jest.fn(async ({ where }: any = {}) => clone(db[table].find((r) => match(r, where)) ?? null));
}

let idSeq = 0;
const mockTx = {
  mealSelection: { deleteMany: jest.fn(async () => ({ count: 0 })), createMany: jest.fn(async ({ data }: any) => ({ count: data.length })) },
};
const mockPrisma = {
  subscription: {
    findUnique: finder('subs'),
    findFirst: finder('subs'),
    findUniqueOrThrow: jest.fn(async ({ where }: any) => {
      const r = db.subs.find((s) => match(s, where));
      if (!r) throw new Error('not found');
      return clone(r);
    }),
    findMany: jest.fn(async () => db.subs.map(clone)),
    update: jest.fn(async ({ where, data }: any) => {
      const r = db.subs.find((s) => match(s, where));
      if (!r) throw new Error('not found');
      Object.assign(r, data);
      return clone(r);
    }),
    updateMany: jest.fn(async ({ where, data }: any) => {
      const rows = db.subs.filter((s) => match(s, where));
      rows.forEach((r) => Object.assign(r, data));
      return { count: rows.length };
    }),
    upsert: jest.fn(async ({ where, update, create }: any) => {
      const r = db.subs.find((s) => match(s, where));
      if (r) {
        Object.assign(r, update);
        return clone(r);
      }
      const row = { id: `sub-${++idSeq}`, ...create };
      db.subs.push(row);
      return clone(row);
    }),
  },
  user: { findUnique: finder('users') },
  goal: { findUnique: finder('goals'), findMany: jest.fn(async () => db.goals.map(clone)) },
  weeklyBox: {
    findMany: jest.fn(async () => []),
    findFirst: finder('boxes'),
    create: jest.fn(async ({ data }: any) => {
      const row = { id: `box-${++idSeq}`, ...data };
      db.boxes.push(row);
      return clone(row);
    }),
  },
  weeklyMenu: { findMany: jest.fn(async ({ where }: any) => db.menus.filter((m) => match(m, where)).map(clone)) },
  $transaction: jest.fn(async (fn: any) => fn(mockTx)),
};
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));

import {
  cancelSubscription,
  createSubscription,
  getMySubscription,
  pauseSubscription,
  refreshSubscriptionStatus,
  resumeSubscription,
  saveWeeklyMenuSelections,
  updateMySubscription,
} from '@/controllers/subscriptionController';
import { addDays, atJakartaTime } from '@/lib/week';

const NOW = new Date('2026-11-10T03:00:00.000Z'); // Tuesday 10:00 WIB
const DAY = 24 * 60 * 60 * 1000;

function setNow(d: Date) {
  jest.setSystemTime(d);
}

function seedSub(over: Row = {}) {
  const row = {
    id: 'sub-1',
    userId: 'u1',
    goalId: 'g1',
    planType: 'MINGGUAN',
    servings: 2,
    status: 'ACTIVE',
    startDate: new Date('2026-11-09T00:00:00.000Z'),
    endDate: null,
    pausedUntil: null,
    ...over,
  };
  db.subs.push(row);
  return row;
}
const sub = (userId = 'u1') => db.subs.find((s) => s.userId === userId)!;

beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] });
});
afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
  setNow(NOW);
  db.subs = [];
  db.boxes = [];
  db.menus = [];
  db.users = [
    { id: 'u1', role: 'USER' },
    { id: 'u2', role: 'USER' },
    { id: 'admin', role: 'ADMIN' },
  ];
  db.goals = [{ id: 'g1', name: 'Diet' }, { id: 'g2', name: 'Bulk' }];
});

describe('createSubscription', () => {
  const valid = { goalId: 'g1', planType: 'MINGGUAN' as const, servings: 2 };

  it('401 when the session user does not exist', async () => {
    const r = await createSubscription('ghost', valid);
    expect(r.status).toBe(401);
    expect(db.subs).toHaveLength(0);
  });

  it.each([
    ['missing goalId', { ...valid, goalId: '' }],
    ['servings 0', { ...valid, servings: 0 }],
    ['servings 7', { ...valid, servings: 7 }],
    ['servings negative', { ...valid, servings: -1 }],
    ['missing planType', { ...valid, planType: '' }],
  ])('400 for %s', async (_n, input) => {
    const r = await createSubscription('u1', input as any);
    expect(r).toMatchObject({ status: 400, error: 'Invalid payload' });
    expect(mockPrisma.subscription.upsert).not.toHaveBeenCalled();
  });

  it('400 for an unknown planType', async () => {
    const r = await createSubscription('u1', { ...valid, planType: 'HARIAN' as any });
    expect(r).toMatchObject({ status: 400, error: 'Invalid planType' });
  });

  it.each([1, 6])('accepts servings boundary %i', async (servings) => {
    const r = await createSubscription('u1', { ...valid, servings });
    expect(r.status).toBe(201);
    expect(sub().servings).toBe(servings);
  });

  it.each(['MINGGUAN', 'BULANAN', 'TAHUNAN'] as const)('creates an UNPAID %s subscription starting now', async (planType) => {
    const r = await createSubscription('u1', { ...valid, planType });
    expect(r.status).toBe(201);
    expect(sub()).toMatchObject({ userId: 'u1', planType, status: 'UNPAID', endDate: null, pausedUntil: null });
    expect(sub().startDate.getTime()).toBe(NOW.getTime());
  });

  it('a non-admin passing userId still creates for themselves (no impersonation)', async () => {
    const r = await createSubscription('u1', { ...valid, userId: 'u2' });
    expect(r.status).toBe(201);
    expect(db.subs.map((s) => s.userId)).toEqual(['u1']);
  });

  it('an admin may create for another user (userId trimmed)', async () => {
    const r = await createSubscription('admin', { ...valid, userId: '  u2  ' });
    expect(r.status).toBe(201);
    expect(db.subs.map((s) => s.userId)).toEqual(['u2']);
  });

  it('an admin with blank userId creates for themselves', async () => {
    await createSubscription('admin', { ...valid, userId: '   ' });
    expect(db.subs.map((s) => s.userId)).toEqual(['admin']);
  });

  it('404 when an admin targets a missing user', async () => {
    const r = await createSubscription('admin', { ...valid, userId: 'nobody' });
    expect(r.status).toBe(404);
    expect(db.subs).toHaveLength(0);
  });

  it.each(['ACTIVE', 'PAUSED', 'UNPAID'])('400 when an existing %s subscription exists', async (status) => {
    seedSub({ status });
    const r = await createSubscription('u1', { ...valid, planType: 'TAHUNAN' });
    expect(r).toMatchObject({ status: 400 });
    expect(sub()).toMatchObject({ status, planType: 'MINGGUAN' });
  });

  it('400 when cancellation is scheduled but endDate is still in the future', async () => {
    seedSub({ endDate: new Date(NOW.getTime() + DAY) });
    const r = await createSubscription('u1', valid);
    expect(r.status).toBe(400);
  });

  it('a CANCELLED user re-subscribes by reusing the row, back to UNPAID with dates cleared', async () => {
    seedSub({
      status: 'CANCELLED',
      planType: 'MINGGUAN',
      servings: 2,
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: new Date('2026-01-08T00:00:00Z'),
      pausedUntil: new Date('2026-01-05T00:00:00Z'),
    });
    const r = await createSubscription('u1', { goalId: 'g2', planType: 'TAHUNAN', servings: 4 });
    expect(r.status).toBe(201);
    expect(db.subs).toHaveLength(1);
    expect(sub()).toMatchObject({
      id: 'sub-1',
      goalId: 'g2',
      planType: 'TAHUNAN',
      servings: 4,
      status: 'UNPAID',
      endDate: null,
      pausedUntil: null,
    });
    expect(sub().startDate.getTime()).toBe(NOW.getTime());
  });

  it('re-subscribe is allowed when endDate passed but status was not yet refreshed', async () => {
    seedSub({ status: 'ACTIVE', endDate: new Date(NOW.getTime() - 1) });
    const r = await createSubscription('u1', valid);
    expect(r.status).toBe(201);
    expect(sub()).toMatchObject({ status: 'UNPAID', endDate: null });
  });

  it('re-subscribe is allowed when endDate is exactly now', async () => {
    seedSub({ status: 'PAUSED', endDate: new Date(NOW) });
    expect((await createSubscription('u1', valid)).status).toBe(201);
  });
});

describe('updateMySubscription', () => {
  const body = { goalId: 'g1', planType: 'MINGGUAN', servings: 2 };

  it.each([
    ['empty goalId', { ...body, goalId: '  ' }],
    ['numeric goalId', { ...body, goalId: 5 }],
    ['bad planType', { ...body, planType: 'HARIAN' }],
    ['fractional servings', { ...body, servings: 1.5 }],
    ['string servings', { ...body, servings: '2' }],
    ['servings 0', { ...body, servings: 0 }],
    ['servings 7', { ...body, servings: 7 }],
  ])('400 for %s', async (_n, input) => {
    seedSub();
    const r = await updateMySubscription('u1', input);
    expect(r).toMatchObject({ status: 400, error: 'Invalid payload' });
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
  });

  it('404 when the user has no subscription', async () => {
    expect((await updateMySubscription('u1', body)).status).toBe(404);
  });

  it('UNPAID: plan, servings and goal can all change', async () => {
    seedSub({ status: 'UNPAID' });
    const r = await updateMySubscription('u1', { goalId: ' g2 ', planType: 'TAHUNAN', servings: 6 });
    expect(r.status).toBe(200);
    expect(sub()).toMatchObject({ goalId: 'g2', planType: 'TAHUNAN', servings: 6 });
  });

  it.each(['ACTIVE', 'PAUSED', 'CANCELLED'])('%s: goal can change when plan and servings stay the same', async (status) => {
    seedSub({ status });
    const r = await updateMySubscription('u1', { ...body, goalId: 'g2' });
    expect(r.status).toBe(200);
    expect(sub().goalId).toBe('g2');
  });

  it.each(['ACTIVE', 'PAUSED', 'CANCELLED'])('%s: changing planType is rejected', async (status) => {
    seedSub({ status });
    const r = await updateMySubscription('u1', { ...body, planType: 'TAHUNAN' });
    expect(r.status).toBe(400);
    expect(sub().planType).toBe('MINGGUAN');
  });

  it.each(['ACTIVE', 'PAUSED'])('%s: changing servings is rejected', async (status) => {
    seedSub({ status });
    const r = await updateMySubscription('u1', { ...body, servings: 6 });
    expect(r.status).toBe(400);
    expect(sub().servings).toBe(2);
  });

  it('price-change-after-payment attack: paid MINGGUAN x1, then PATCH to TAHUNAN x6 is refused and nothing is written', async () => {
    seedSub({ status: 'ACTIVE', planType: 'MINGGUAN', servings: 1 });
    const r = await updateMySubscription('u1', { goalId: 'g2', planType: 'TAHUNAN', servings: 6 });
    expect(r.status).toBe(400);
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    expect(sub()).toMatchObject({ planType: 'MINGGUAN', servings: 1, goalId: 'g1' });
  });

  it('404 when the goal does not exist', async () => {
    seedSub();
    const r = await updateMySubscription('u1', { ...body, goalId: 'nope' });
    expect(r.status).toBe(404);
    expect(sub().goalId).toBe('g1');
  });
});

describe('pauseSubscription / resumeSubscription', () => {
  it.each([undefined, null, ''])('400 when resumeDate is %p', async (v) => {
    expect((await pauseSubscription('u1', v)).status).toBe(400);
  });

  it('400 for an unparseable resumeDate', async () => {
    seedSub();
    const r = await pauseSubscription('u1', 'not-a-date');
    expect(r).toMatchObject({ status: 400, error: 'Invalid resumeDate format' });
    expect(sub().status).toBe('ACTIVE');
  });

  it('accepts a resumeDate exactly 28 days ahead', async () => {
    seedSub();
    const resume = new Date(NOW.getTime() + 28 * DAY);
    const r = await pauseSubscription('u1', resume.toISOString());
    expect(r.status).toBe(200);
    expect(sub().status).toBe('PAUSED');
    expect(sub().pausedUntil.getTime()).toBe(resume.getTime());
    expect((r.data as any).resumeDate).toBe(resume.toISOString());
  });

  it('rejects a resumeDate 28 days + 1ms ahead', async () => {
    seedSub();
    const r = await pauseSubscription('u1', new Date(NOW.getTime() + 28 * DAY + 1).toISOString());
    expect(r.status).toBe(400);
    expect(sub().status).toBe('ACTIVE');
  });

  it('404 when no subscription', async () => {
    expect((await pauseSubscription('u1', '2026-11-20')).status).toBe(404);
  });

  it.each(['PAUSED', 'UNPAID', 'CANCELLED'])('cannot pause a %s subscription', async (status) => {
    seedSub({ status });
    const r = await pauseSubscription('u1', '2026-11-20');
    expect(r.status).toBe(400);
    expect(sub().status).toBe(status);
  });

  it('resume: PAUSED -> ACTIVE and pausedUntil cleared', async () => {
    seedSub({ status: 'PAUSED', pausedUntil: new Date('2026-11-20T00:00:00Z') });
    const r = await resumeSubscription('u1');
    expect(r.status).toBe(200);
    expect(sub()).toMatchObject({ status: 'ACTIVE', pausedUntil: null });
  });

  it.each(['ACTIVE', 'UNPAID', 'CANCELLED'])('cannot resume a %s subscription', async (status) => {
    seedSub({ status });
    expect((await resumeSubscription('u1')).status).toBe(400);
    expect(sub().status).toBe(status);
  });

  it('resume 404 when no subscription', async () => {
    expect((await resumeSubscription('u1')).status).toBe(404);
  });

  it('auto-resume: a pause ends by itself when pausedUntil passes', async () => {
    seedSub();
    const resume = new Date(NOW.getTime() + 7 * DAY);
    await pauseSubscription('u1', resume.toISOString());

    setNow(new Date(resume.getTime() - 1));
    expect((await getMySubscription('u1')).data).toMatchObject({ status: 'PAUSED' });

    setNow(resume);
    expect((await getMySubscription('u1')).data).toMatchObject({ status: 'ACTIVE', pausedUntil: null });
  });
});

describe('cancelSubscription', () => {
  it('404 when no subscription', async () => {
    expect((await cancelSubscription('u1')).status).toBe(404);
  });

  it.each(['UNPAID', 'CANCELLED'])('400 for a %s subscription', async (status) => {
    seedSub({ status });
    expect((await cancelSubscription('u1')).status).toBe(400);
    expect(sub().endDate).toBeNull();
  });

  it('400 when cancellation is already scheduled', async () => {
    const end = new Date(NOW.getTime() + DAY);
    seedSub({ endDate: end });
    const r = await cancelSubscription('u1');
    expect(r.status).toBe(400);
    expect(sub().endDate.getTime()).toBe(end.getTime());
  });

  it('MINGGUAN: endDate = startDate + 7 days, status stays ACTIVE', async () => {
    const start = new Date('2026-11-09T00:00:00Z');
    seedSub({ planType: 'MINGGUAN', startDate: start });
    const r = await cancelSubscription('u1');
    expect(r.status).toBe(200);
    expect(sub().status).toBe('ACTIVE');
    expect(sub().endDate.getTime()).toBe(start.getTime() + 7 * DAY);
    expect((r.data as any).subscription.endDate.getTime()).toBe(start.getTime() + 7 * DAY);
  });

  it('BULANAN: endDate = startDate + 1 month', async () => {
    seedSub({ planType: 'BULANAN', startDate: new Date(2026, 10, 1, 9, 0) });
    await cancelSubscription('u1');
    expect(sub().endDate.getTime()).toBe(new Date(2026, 11, 1, 9, 0).getTime());
    expect(sub().status).toBe('ACTIVE');
  });

  // Regression: plain setMonth overflowed (Jan 31 + 1 month = Mar 3); end date is clamped to the month's last day.
  it('BULANAN started Jan 31 should end on Feb 28, not roll into March', async () => {
    setNow(new Date(2026, 1, 10));
    seedSub({ planType: 'BULANAN', startDate: new Date(2026, 0, 31) });
    await cancelSubscription('u1');
    expect(sub().endDate.getTime()).toBe(new Date(2026, 1, 28).getTime());
  });

  it('TAHUNAN: endDate = startDate + 1 year', async () => {
    seedSub({ planType: 'TAHUNAN', startDate: new Date(2026, 5, 15) });
    await cancelSubscription('u1');
    expect(sub().endDate.getTime()).toBe(new Date(2027, 5, 15).getTime());
  });

  it('a PAUSED subscription can be cancelled and stays PAUSED until endDate', async () => {
    seedSub({ status: 'PAUSED', pausedUntil: new Date(NOW.getTime() + 3 * DAY) });
    const r = await cancelSubscription('u1');
    expect(r.status).toBe(200);
    expect(sub().status).toBe('PAUSED');
  });

  it('when the cycle already ended, cancel takes effect immediately', async () => {
    seedSub({ planType: 'MINGGUAN', startDate: new Date(NOW.getTime() - 10 * DAY) });
    const r = await cancelSubscription('u1');
    expect(r.status).toBe(200);
    expect((r.data as any).subscription.status).toBe('CANCELLED');
  });

  it('cancel then refresh: ACTIVE before endDate, CANCELLED at endDate, then re-subscribe works', async () => {
    const start = new Date('2026-11-09T00:00:00Z');
    seedSub({ planType: 'MINGGUAN', startDate: start, status: 'PAUSED', pausedUntil: new Date('2026-11-25T00:00:00Z') });
    await cancelSubscription('u1');
    const end = start.getTime() + 7 * DAY;

    setNow(new Date(end - 1));
    await refreshSubscriptionStatus('u1');
    expect(sub().status).toBe('PAUSED');
    expect((await createSubscription('u1', { goalId: 'g1', planType: 'BULANAN', servings: 3 })).status).toBe(400);

    setNow(new Date(end));
    await refreshSubscriptionStatus('u1');
    expect(sub()).toMatchObject({ status: 'CANCELLED', pausedUntil: null });
    expect((await cancelSubscription('u1')).status).toBe(400);

    const r = await createSubscription('u1', { goalId: 'g1', planType: 'BULANAN', servings: 3 });
    expect(r.status).toBe(201);
    expect(sub()).toMatchObject({ status: 'UNPAID', planType: 'BULANAN', endDate: null });
  });
});

describe('refreshSubscriptionStatus / getMySubscription', () => {
  it('uses two updateMany calls: endDate -> CANCELLED, then pausedUntil -> ACTIVE', async () => {
    await refreshSubscriptionStatus('u1');
    expect(mockPrisma.subscription.updateMany).toHaveBeenCalledTimes(2);
    expect(mockPrisma.subscription.updateMany.mock.calls[0][0]).toEqual({
      where: { userId: 'u1', status: { not: 'CANCELLED' }, endDate: { lte: NOW } },
      data: { status: 'CANCELLED', pausedUntil: null },
    });
    expect(mockPrisma.subscription.updateMany.mock.calls[1][0]).toEqual({
      where: { userId: 'u1', status: 'PAUSED', pausedUntil: { lte: NOW } },
      data: { status: 'ACTIVE', pausedUntil: null },
    });
  });

  it('PAUSED with pausedUntil exactly now -> ACTIVE', async () => {
    seedSub({ status: 'PAUSED', pausedUntil: new Date(NOW) });
    await refreshSubscriptionStatus('u1');
    expect(sub()).toMatchObject({ status: 'ACTIVE', pausedUntil: null });
  });

  it('PAUSED with future pausedUntil stays PAUSED', async () => {
    seedSub({ status: 'PAUSED', pausedUntil: new Date(NOW.getTime() + 1) });
    await refreshSubscriptionStatus('u1');
    expect(sub().status).toBe('PAUSED');
  });

  it('expired endDate beats expired pause: ends CANCELLED, not resurrected to ACTIVE', async () => {
    seedSub({ status: 'PAUSED', pausedUntil: new Date(NOW.getTime() - DAY), endDate: new Date(NOW.getTime() - DAY) });
    await refreshSubscriptionStatus('u1');
    expect(sub()).toMatchObject({ status: 'CANCELLED', pausedUntil: null });
  });

  it('ACTIVE without endDate is untouched', async () => {
    seedSub();
    await refreshSubscriptionStatus('u1');
    expect(sub().status).toBe('ACTIVE');
  });

  it('only touches the given user', async () => {
    seedSub({ userId: 'u2', id: 'sub-2', endDate: new Date(NOW.getTime() - 1) });
    await refreshSubscriptionStatus('u1');
    expect(sub('u2').status).toBe('ACTIVE');
  });

  it('getMySubscription refreshes before reading', async () => {
    seedSub({ endDate: new Date(NOW.getTime() - 1) });
    const r = await getMySubscription('u1');
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ status: 'CANCELLED', weeklyBoxes: [] });
    const lastUpdate = Math.max(...mockPrisma.subscription.updateMany.mock.invocationCallOrder);
    expect(lastUpdate).toBeLessThan(mockPrisma.subscription.findFirst.mock.invocationCallOrder[0]);
  });

  it('getMySubscription 404 when none', async () => {
    expect((await getMySubscription('u1')).status).toBe(404);
  });
});

describe('week helpers', () => {
  const origTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = origTz;
  });

  it.each(['UTC', 'Asia/Jakarta'])('atJakartaTime gives the same instant on a %s server', (tz) => {
    process.env.TZ = tz;
    // 2026-11-15 05:00 WIB and 23:30 WIB are both on Jakarta Sunday 15 Nov.
    expect(atJakartaTime(new Date('2026-11-14T22:00:00Z'), 18).toISOString()).toBe('2026-11-15T11:00:00.000Z');
    expect(atJakartaTime(new Date('2026-11-15T16:30:00Z'), 18).toISOString()).toBe('2026-11-15T11:00:00.000Z');
    // 2026-11-15 17:30Z is already Monday 00:30 WIB.
    expect(atJakartaTime(new Date('2026-11-15T17:30:00Z'), 18, 30).toISOString()).toBe('2026-11-16T11:30:00.000Z');
  });

  it('addDays adds exact 24h steps, negative too', () => {
    const d = new Date('2026-11-16T00:00:00Z');
    expect(addDays(d, -1).toISOString()).toBe('2026-11-15T00:00:00.000Z');
    expect(addDays(d, 7).toISOString()).toBe('2026-11-23T00:00:00.000Z');
  });
});

describe.each(['UTC', 'Asia/Jakarta'])('saveWeeklyMenuSelections (server TZ %s)', (tz) => {
  const origTz = process.env.TZ;
  // Sunday 15 Nov 2026 18:00 WIB, the deadline for the week starting Monday 16 Nov.
  const DEADLINE = new Date('2026-11-15T11:00:00.000Z');
  let weekStart: Date;
  const sel = (recipeId = 'r1', extra: Row = {}) => ({ day: 'SENIN' as const, mealType: 'LUNCH' as const, recipeId, ...extra });

  beforeEach(() => {
    process.env.TZ = tz;
    weekStart = new Date(2026, 10, 16); // local Monday midnight, as getStartOfWeek computes it
    db.menus = [{ recipeId: 'r1', weekStartDate: weekStart }, { recipeId: 'r2', weekStartDate: weekStart }];
    seedSub();
  });
  afterAll(() => {
    process.env.TZ = origTz;
  });

  const save = (mealSelections: any[] = [sel()], ws: any = weekStart) =>
    saveWeeklyMenuSelections('u1', { mealSelections, weekStartDate: ws });

  it('400 without selections or weekStartDate', async () => {
    expect((await save([])).status).toBe(400);
    expect((await save([sel()], '')).status).toBe(400);
  });

  it('400 for an invalid weekStartDate', async () => {
    expect((await save([sel()], 'garbage')).status).toBe(400);
  });

  it('404 when the week has no menu', async () => {
    db.menus = [];
    expect((await save()).status).toBe(404);
  });

  it('400 when a recipe is not in that week\'s menu', async () => {
    const r = await save([sel('r1'), sel('r-other', { day: 'SELASA' })]);
    expect(r.status).toBe(400);
    expect(r.error).toContain('r-other');
    expect(mockPrisma.weeklyBox.create).not.toHaveBeenCalled();
  });

  it('a recipe from a different week\'s menu is rejected', async () => {
    db.menus.push({ recipeId: 'r-next', weekStartDate: addDays(weekStart, 7) });
    expect((await save([sel('r-next')])).status).toBe(400);
  });

  it('any weekday inside the week maps to the same week', async () => {
    setNow(new Date(DEADLINE.getTime() - DAY));
    const r = await save([sel()], new Date(2026, 10, 19, 15)); // Thursday
    expect(r.status).toBe(200);
    expect(db.boxes[0].weekStartDate.getTime()).toBe(weekStart.getTime());
  });

  it('accepts exactly at the computed Sunday 18:00 WIB deadline and creates the box', async () => {
    setNow(DEADLINE);
    const r = await save([sel('r1', { serving: 3 }), sel('r2', { mealType: 'DINNER' }), sel('r2')]);
    expect(r).toEqual({ data: { success: true }, status: 200 });
    expect(db.boxes).toHaveLength(1);
    expect(db.boxes[0]).toMatchObject({ userId: 'u1', status: 'PENDING_SELECTION', isAutoSelected: false });
    expect(db.boxes[0].selectionDeadline.toISOString()).toBe(DEADLINE.toISOString());
    expect(db.boxes[0].weekEndDate.getTime()).toBe(new Date(2026, 10, 22, 23, 59, 59, 999).getTime());
    expect(mockTx.mealSelection.deleteMany).toHaveBeenCalledTimes(2); // SENIN:LUNCH, SENIN:DINNER
    const created = (mockTx.mealSelection.createMany.mock.calls[0] as any)[0].data;
    expect(created).toHaveLength(3);
    expect(created[0]).toMatchObject({ recipeId: 'r1', serving: 3, dayOfWeek: 'SENIN', mealType: 'LUNCH' });
    expect(created[1].serving).toBe(1);
  });

  it('rejects 1ms after the computed deadline', async () => {
    setNow(new Date(DEADLINE.getTime() + 1));
    const r = await save();
    expect(r).toMatchObject({ status: 400, error: 'Batas waktu pemilihan menu sudah lewat.' });
    expect(db.boxes).toHaveLength(0);
  });

  it('uses the existing box deadline when one exists (boundary inclusive)', async () => {
    const custom = new Date('2026-11-12T00:00:00Z');
    db.boxes.push({ id: 'box-x', userId: 'u1', weekStartDate: weekStart, status: 'PENDING_SELECTION', selectionDeadline: custom });
    setNow(custom);
    expect((await save()).status).toBe(200);
    setNow(new Date(custom.getTime() + 1));
    expect((await save()).status).toBe(400);
    expect(mockPrisma.weeklyBox.create).not.toHaveBeenCalled();
  });

  it.each(['LOCKED', 'COMPLETED', 'SKIPPED'])('rejects when the existing box is %s', async (status) => {
    setNow(new Date(DEADLINE.getTime() - DAY));
    db.boxes.push({ id: 'box-x', userId: 'u1', weekStartDate: weekStart, status, selectionDeadline: DEADLINE });
    const r = await save();
    expect(r.status).toBe(400);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  describe('subscription state (no existing box)', () => {
    beforeEach(() => {
      setNow(new Date(DEADLINE.getTime() - DAY));
      db.subs = [];
    });

    it('404 without a subscription', async () => {
      expect((await save()).status).toBe(404);
    });

    it('400 when CANCELLED', async () => {
      seedSub({ status: 'CANCELLED' });
      expect((await save()).status).toBe(400);
    });

    it('400 when the week starts exactly at endDate', async () => {
      seedSub({ endDate: new Date(weekStart) });
      expect((await save()).status).toBe(400);
    });

    it('400 when the week starts after endDate', async () => {
      seedSub({ endDate: new Date(weekStart.getTime() - 1) });
      expect((await save()).status).toBe(400);
    });

    it('allowed when endDate is after the week start (last paid week)', async () => {
      seedSub({ endDate: new Date(weekStart.getTime() + 1) });
      expect((await save()).status).toBe(200);
    });

    it('PAUSED with no pausedUntil -> 400', async () => {
      seedSub({ status: 'PAUSED', pausedUntil: null });
      expect((await save()).status).toBe(400);
    });

    it('PAUSED until exactly the week start -> 400', async () => {
      seedSub({ status: 'PAUSED', pausedUntil: new Date(weekStart) });
      expect((await save()).status).toBe(400);
    });

    it('PAUSED until after the week start -> 400', async () => {
      seedSub({ status: 'PAUSED', pausedUntil: addDays(weekStart, 2) });
      expect((await save()).status).toBe(400);
    });

    it('PAUSED but resuming before the week starts -> allowed', async () => {
      seedSub({ status: 'PAUSED', pausedUntil: new Date(weekStart.getTime() - 1) });
      expect((await save()).status).toBe(200);
    });

    it('UNPAID is allowed to pre-select', async () => {
      seedSub({ status: 'UNPAID' });
      expect((await save()).status).toBe(200);
    });
  });
});
