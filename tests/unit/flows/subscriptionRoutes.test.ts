import { NextRequest } from 'next/server';

const mockPrisma = {
  user: { findUnique: jest.fn() },
  goal: { findMany: jest.fn(), findUnique: jest.fn() },
  subscription: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
  weeklyBox: { findMany: jest.fn() },
};
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));

const mockGetSessionUserId = jest.fn();
// jose is ESM-only and not transformed here, so the real session module is not loaded; this mirrors getAuthErrorResponse.
jest.mock('@/lib/session', () => {
  const { NextResponse } = jest.requireActual('next/server');
  return {
    getSessionUserId: (...a: unknown[]) => mockGetSessionUserId(...a),
    getAuthErrorResponse: (error: string) =>
      error === 'CONFIG_MISSING'
        ? NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 })
        : NextResponse.json({ error: 'Not authenticated.' }, { status: 401 }),
  };
});

import { GET as listGET, POST as listPOST } from '@/app/api/subscriptions/route';
import { GET as meGET, PATCH as mePATCH } from '@/app/api/subscriptions/me/route';
import { PATCH as pausePATCH } from '@/app/api/subscriptions/me/pause/route';
import { PATCH as resumePATCH } from '@/app/api/subscriptions/me/resume/route';
import { PATCH as cancelPATCH } from '@/app/api/subscriptions/me/cancel/route';

const roles: Record<string, string> = { u1: 'USER', admin: 'ADMIN', nutri: 'NUTRITIONIST' };
const allSubs = [
  { id: 's1', userId: 'u1', status: 'ACTIVE', user: { id: 'u1', name: 'Alice', email: 'alice@x.test', role: 'USER' } },
  { id: 's2', userId: 'u2', status: 'ACTIVE', user: { id: 'u2', name: 'Bob', email: 'bob@x.test', role: 'USER' } },
];
const goals = [{ id: 'g1', name: 'Diet' }];

const req = (url: string, method = 'GET', body?: unknown) =>
  new NextRequest(`http://localhost${url}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSessionUserId.mockResolvedValue({ userId: 'u1' });
  mockPrisma.user.findUnique.mockImplementation(async ({ where }: any) =>
    roles[where.id] ? { id: where.id, role: roles[where.id] } : null
  );
  mockPrisma.subscription.findMany.mockResolvedValue(allSubs);
  mockPrisma.goal.findMany.mockResolvedValue(goals);
  mockPrisma.subscription.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.weeklyBox.findMany.mockResolvedValue([]);
});

describe('GET /api/subscriptions (subscriber list)', () => {
  it('401 when not logged in', async () => {
    mockGetSessionUserId.mockResolvedValue({ error: 'UNAUTHENTICATED' });
    const res = await listGET(req('/api/subscriptions'));
    expect(res.status).toBe(401);
    expect(mockPrisma.subscription.findMany).not.toHaveBeenCalled();
  });

  it('500 when auth config is missing', async () => {
    mockGetSessionUserId.mockResolvedValue({ error: 'CONFIG_MISSING' });
    expect((await listGET(req('/api/subscriptions'))).status).toBe(500);
  });

  it('admin gets every subscription plus goals', async () => {
    mockGetSessionUserId.mockResolvedValue({ userId: 'admin' });
    const res = await listGET(req('/api/subscriptions'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'success', data: allSubs, goals });
  });

  it.each(['u1', 'nutri'])('%s (non-admin) gets goals but no subscriber data', async (userId) => {
    mockGetSessionUserId.mockResolvedValue({ userId });
    const res = await listGET(req('/api/subscriptions'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ status: 'success', data: [], goals });
    const text = JSON.stringify(json);
    expect(text).not.toContain('bob@x.test');
    expect(text).not.toContain('alice@x.test');
  });

  it('a session for a deleted user is treated as non-admin', async () => {
    mockGetSessionUserId.mockResolvedValue({ userId: 'ghost' });
    const json = await (await listGET(req('/api/subscriptions'))).json();
    expect(json.data).toEqual([]);
  });

  it('500 when the DB fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockPrisma.goal.findMany.mockRejectedValue(new Error('db down'));
    expect((await listGET(req('/api/subscriptions'))).status).toBe(500);
  });
});

describe('POST /api/subscriptions', () => {
  const body = { goalId: 'g1', planType: 'MINGGUAN', servings: 2 };

  beforeEach(() => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    mockPrisma.subscription.upsert.mockImplementation(async ({ create }: any) => ({ id: 'new', ...create }));
  });

  it('401 when not logged in', async () => {
    mockGetSessionUserId.mockResolvedValue({ error: 'UNAUTHENTICATED' });
    expect((await listPOST(req('/api/subscriptions', 'POST', body))).status).toBe(401);
  });

  it.each([
    ['servings 7', { ...body, servings: 7 }],
    ['servings 0', { ...body, servings: 0 }],
    ['servings 2.5', { ...body, servings: 2.5 }],
    ['bad planType', { ...body, planType: 'HARIAN' }],
    ['missing goalId', { planType: 'MINGGUAN', servings: 2 }],
  ])('400 for %s', async (_n, b) => {
    const res = await listPOST(req('/api/subscriptions', 'POST', b));
    expect(res.status).toBe(400);
    expect(mockPrisma.subscription.upsert).not.toHaveBeenCalled();
  });

  it('201 creates an UNPAID subscription for the session user', async () => {
    const res = await listPOST(req('/api/subscriptions', 'POST', body));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toMatchObject({ userId: 'u1', status: 'UNPAID', planType: 'MINGGUAN', servings: 2 });
  });

  it('a customer cannot create a subscription for someone else', async () => {
    await listPOST(req('/api/subscriptions', 'POST', { ...body, userId: 'admin' }));
    expect(mockPrisma.subscription.upsert.mock.calls[0][0].where).toEqual({ userId: 'u1' });
  });

  it('400 when an active subscription exists', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ status: 'ACTIVE', endDate: null });
    const res = await listPOST(req('/api/subscriptions', 'POST', body));
    expect(res.status).toBe(400);
  });

  it('500 on malformed JSON', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const r = new NextRequest('http://localhost/api/subscriptions', { method: 'POST', body: '{nope' });
    expect((await listPOST(r)).status).toBe(500);
  });
});

describe('/api/subscriptions/me', () => {
  it('GET 401 when not logged in', async () => {
    mockGetSessionUserId.mockResolvedValue({ error: 'UNAUTHENTICATED' });
    expect((await meGET(req('/api/subscriptions/me'))).status).toBe(401);
  });

  it('GET returns only the session user\'s subscription', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: 's1', userId: 'u1', status: 'ACTIVE' });
    const res = await meGET(req('/api/subscriptions/me'));
    expect(res.status).toBe(200);
    expect(mockPrisma.subscription.findFirst.mock.calls[0][0].where).toEqual({ userId: 'u1' });
    expect(await res.json()).toMatchObject({ id: 's1', weeklyBoxes: [] });
  });

  it('GET 404 without a subscription', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue(null);
    expect((await meGET(req('/api/subscriptions/me'))).status).toBe(404);
  });

  it('PATCH rejects a plan change after payment (price attack via route)', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: 's1', status: 'ACTIVE', planType: 'MINGGUAN', servings: 1 });
    const res = await mePATCH(req('/api/subscriptions/me', 'PATCH', { goalId: 'g1', planType: 'TAHUNAN', servings: 6 }));
    expect(res.status).toBe(400);
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
  });

  it('PATCH 400 from schema for servings 7', async () => {
    const res = await mePATCH(req('/api/subscriptions/me', 'PATCH', { goalId: 'g1', planType: 'MINGGUAN', servings: 7 }));
    expect(res.status).toBe(400);
    expect(mockPrisma.subscription.findFirst).not.toHaveBeenCalled();
  });

  it('PATCH 200 for a goal-only change while ACTIVE', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: 's1', status: 'ACTIVE', planType: 'MINGGUAN', servings: 1 });
    mockPrisma.goal.findUnique.mockResolvedValue({ id: 'g2' });
    mockPrisma.subscription.update.mockResolvedValue({ id: 's1', goalId: 'g2' });
    const res = await mePATCH(req('/api/subscriptions/me', 'PATCH', { goalId: 'g2', planType: 'MINGGUAN', servings: 1 }));
    expect(res.status).toBe(200);
    expect(mockPrisma.subscription.update.mock.calls[0][0].where).toEqual({ id: 's1' });
  });
});

describe('/api/subscriptions/me/{pause,resume,cancel}', () => {
  it.each([
    ['pause', () => pausePATCH(req('/x', 'PATCH', { resumeDate: '2026-11-20' }))],
    ['resume', () => resumePATCH(req('/x', 'PATCH'))],
    ['cancel', () => cancelPATCH(req('/x', 'PATCH'))],
  ])('%s 401 when not logged in', async (_n, call) => {
    mockGetSessionUserId.mockResolvedValue({ error: 'UNAUTHENTICATED' });
    expect((await call()).status).toBe(401);
  });

  it('pause 400 when resumeDate is missing from the body', async () => {
    expect((await pausePATCH(req('/x', 'PATCH', {}))).status).toBe(400);
  });

  it('pause 200 for an ACTIVE subscription', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] }).setSystemTime(new Date('2026-11-10T00:00:00Z'));
    try {
      mockPrisma.subscription.findFirst.mockResolvedValue({ id: 's1', status: 'ACTIVE' });
      mockPrisma.subscription.update.mockResolvedValue({ id: 's1', status: 'PAUSED' });
      const res = await pausePATCH(req('/x', 'PATCH', { resumeDate: '2026-11-20T00:00:00.000Z' }));
      expect(res.status).toBe(200);
      expect((await res.json()).resumeDate).toBe('2026-11-20T00:00:00.000Z');
    } finally {
      jest.useRealTimers();
    }
  });

  it('resume 400 when ACTIVE', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: 's1', status: 'ACTIVE' });
    expect((await resumePATCH(req('/x', 'PATCH'))).status).toBe(400);
  });

  it('cancel 200 schedules endDate and acts on the session user only', async () => {
    const startDate = new Date('2026-11-09T00:00:00Z');
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: 's1', status: 'ACTIVE', planType: 'MINGGUAN', startDate, endDate: null });
    mockPrisma.subscription.findUniqueOrThrow.mockResolvedValue({ id: 's1', status: 'ACTIVE' });
    const res = await cancelPATCH(req('/x', 'PATCH'));
    expect(res.status).toBe(200);
    expect(mockPrisma.subscription.findFirst.mock.calls[0][0].where).toEqual({ userId: 'u1' });
    expect(mockPrisma.subscription.update.mock.calls[0][0].data.endDate.toISOString()).toBe('2026-11-16T00:00:00.000Z');
  });

  it('cancel 500 when the DB throws', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockPrisma.subscription.findFirst.mockRejectedValue(new Error('boom'));
    expect((await cancelPATCH(req('/x', 'PATCH'))).status).toBe(500);
  });
});
