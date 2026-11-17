// JWT_SECRET must exist before proxy.ts loads (it encodes the secret at module load).
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.GOOGLE_CLIENT_ID = 'cid';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost/api/auth/google/callback';
process.env.NEXT_PUBLIC_BASE_URL = 'http://app.test';

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const mockPrisma: any = { user: { findUnique: jest.fn() } };
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/email', () => ({ sendPasswordResetEmail: jest.fn() }));

// jose ships ESM only, which this jest config cannot load. Stand in a real HS256 verifier.
jest.mock('jose', () => {
  const c = require('crypto');
  return {
    jwtVerify: async (token: string, key: Uint8Array) => {
      const [h, p, s] = String(token).split('.');
      if (!h || !p || !s) throw new Error('JWSInvalid');
      const expected = c.createHmac('sha256', Buffer.from(key)).update(`${h}.${p}`).digest('base64url');
      if (expected.length !== s.length || !c.timingSafeEqual(Buffer.from(expected), Buffer.from(s))) {
        throw new Error('JWSSignatureVerificationFailed');
      }
      const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
      if (typeof payload.exp === 'number' && payload.exp < Date.now() / 1000) throw new Error('JWTExpired');
      return { payload };
    },
    SignJWT: class {},
  };
});

const mockHandleGoogleCallback = jest.fn();
jest.mock('@/controllers/authController', () => ({
  ...jest.requireActual('@/controllers/authController'),
  handleGoogleCallback: (...a: unknown[]) => mockHandleGoogleCallback(...a),
}));

import { verifyRole, verifyAdminRequest } from '@/lib/auth';
import { proxy as middleware, config } from '@/proxy';
import { GET as googleStart } from '@/app/api/auth/google/route';
import { GET as googleCallback } from '@/app/api/auth/google/callback/route';

function sign(payload: object, secret = process.env.JWT_SECRET!) {
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const body = `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}`;
  return `${body}.${crypto.createHmac('sha256', secret).update(body).digest('base64url')}`;
}
const nowSec = () => Math.floor(Date.now() / 1000);

function reqWithToken(path: string, token?: string) {
  return new NextRequest(`http://app.test${path}`, token ? { headers: { cookie: `token=${token}` } } : {});
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-jwt-secret';
});

describe('verifyRole', () => {
  it.each([
    ['ADMIN', 'ADMIN', true],
    ['ADMIN', 'NUTRITIONIST', true],
    ['NUTRITIONIST', 'NUTRITIONIST', true],
    ['NUTRITIONIST', 'ADMIN', false],
    ['USER', 'ADMIN', false],
    ['USER', 'NUTRITIONIST', false],
  ])('user role %s checking %s -> allowed=%s', async (actual, wanted, allowed) => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: actual });
    const r = await verifyRole('u1', wanted as 'ADMIN' | 'NUTRITIONIST');
    expect(r === null).toBe(allowed);
    if (!allowed) expect(r).toMatchObject({ status: 403 });
  });

  it('fails for an unknown user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    expect(await verifyRole('ghost', 'NUTRITIONIST')).toMatchObject({ status: 403 });
  });
});

describe('verifyAdminRequest (real session + cookie)', () => {
  it('passes a signed ADMIN token', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
    expect(await verifyAdminRequest(reqWithToken('/api/x', sign({ id: 'a1' })))).toEqual({ userId: 'a1' });
  });

  it('rejects no cookie as UNAUTHENTICATED', async () => {
    expect(await verifyAdminRequest(reqWithToken('/api/x'))).toEqual({ error: 'UNAUTHENTICATED' });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a token signed with another secret', async () => {
    expect(await verifyAdminRequest(reqWithToken('/api/x', sign({ id: 'a1' }, 'attacker')))).toEqual({ error: 'UNAUTHENTICATED' });
  });

  it('role comes from the DB, not the token: forged role=ADMIN for a USER fails', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'USER' });
    expect(await verifyAdminRequest(reqWithToken('/api/x', sign({ id: 'u1', role: 'ADMIN' })))).toEqual({ error: 'FORBIDDEN' });
  });

  it('rejects a token without a string id', async () => {
    expect(await verifyAdminRequest(reqWithToken('/api/x', sign({ id: 123 })))).toEqual({ error: 'UNAUTHENTICATED' });
  });

  it('CONFIG_MISSING when JWT_SECRET is unset', async () => {
    delete process.env.JWT_SECRET;
    expect(await verifyAdminRequest(reqWithToken('/api/x', 'whatever'))).toEqual({ error: 'CONFIG_MISSING' });
  });
});

describe('middleware', () => {
  const location = (res: Response) => res.headers.get('location');
  const isNext = (res: Response) => res.headers.get('x-middleware-next') === '1';
  const tok = (role: string, extra: object = {}) => sign({ id: 'u', role, exp: nowSec() + 3600, ...extra });

  it('matcher covers subscription, dashboard, profile, admin and nutritionist', () => {
    expect(config.matcher).toEqual(expect.arrayContaining([
      '/subscription/:path*', '/dashboard/:path*', '/profile/:path*', '/admin/:path*', '/nutritionist/:path*',
    ]));
  });

  it.each(['/subscription', '/subscription/checkout', '/dashboard', '/admin', '/nutritionist/recipes'])(
    'logged-out visit to %s redirects to /login', async (p) => {
      expect(location(await middleware(reqWithToken(p)))).toBe('http://app.test/login');
    });

  it('public paths pass through without a token', async () => {
    expect(isNext(await middleware(reqWithToken('/menu')))).toBe(true);
  });

  it('USER is redirected from /admin to /unauthorized', async () => {
    expect(location(await middleware(reqWithToken('/admin/deliveries', tok('USER'))))).toBe('http://app.test/unauthorized');
  });

  it('NUTRITIONIST is redirected from /admin', async () => {
    expect(location(await middleware(reqWithToken('/admin', tok('NUTRITIONIST'))))).toBe('http://app.test/unauthorized');
  });

  it('USER is redirected from /nutritionist', async () => {
    expect(location(await middleware(reqWithToken('/nutritionist', tok('USER'))))).toBe('http://app.test/unauthorized');
  });

  it.each([['ADMIN', '/admin'], ['ADMIN', '/nutritionist'], ['NUTRITIONIST', '/nutritionist'], ['USER', '/subscription/plan']])(
    '%s may open %s', async (role, p) => {
      expect(isNext(await middleware(reqWithToken(p, tok(role))))).toBe(true);
    });

  it('a forged token (wrong secret) with role ADMIN goes to /login', async () => {
    const forged = sign({ id: 'x', role: 'ADMIN' }, 'attacker-secret');
    expect(location(await middleware(reqWithToken('/admin', forged)))).toBe('http://app.test/login');
  });

  it('an expired token goes to /login', async () => {
    expect(location(await middleware(reqWithToken('/dashboard', tok('USER', { exp: nowSec() - 10 }))))).toBe('http://app.test/login');
  });

  it('garbage token goes to /login', async () => {
    expect(location(await middleware(reqWithToken('/profile', 'not.a.jwt')))).toBe('http://app.test/login');
  });
});

describe('Google OAuth state (CSRF)', () => {
  it('start: sets an httpOnly oauth_state cookie and puts the same state in the Google URL', async () => {
    const res = await googleStart();
    const loc = new URL(res.headers.get('location')!);
    expect(loc.origin + loc.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    const state = loc.searchParams.get('state');
    expect(state).toMatch(/^[0-9a-f]{32}$/);
    const cookie = res.cookies.get('oauth_state');
    expect(cookie?.value).toBe(state);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/api/auth/google' });
    expect(loc.searchParams.get('client_id')).toBe('cid');
  });

  it('start: each call uses a fresh state', async () => {
    const a = (await googleStart()).cookies.get('oauth_state')?.value;
    const b = (await googleStart()).cookies.get('oauth_state')?.value;
    expect(a).not.toBe(b);
  });

  it('start: 500 when Google config is missing', async () => {
    const saved = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    expect((await googleStart()).status).toBe(500);
    process.env.GOOGLE_CLIENT_ID = saved;
  });

  const cb = (query: string, cookieState?: string) =>
    googleCallback(new NextRequest(`http://app.test/api/auth/google/callback?${query}`,
      cookieState ? { headers: { cookie: `oauth_state=${cookieState}` } } : {}));

  it.each([
    ['missing state param', 'code=c', 'abc'],
    ['missing cookie', 'code=c&state=abc', undefined],
    ['mismatched state', 'code=c&state=evil', 'abc'],
    ['empty state', 'code=c&state=', 'abc'],
  ])('callback rejects %s without exchanging the code', async (_n, q, ck) => {
    const res = await cb(q, ck);
    expect(res.headers.get('location')).toBe('http://app.test/login?error=google_failed');
    expect(mockHandleGoogleCallback).not.toHaveBeenCalled();
  });

  it('callback with matching state exchanges the code and clears the cookie', async () => {
    mockHandleGoogleCallback.mockResolvedValue(NextResponse.redirect('http://app.test/dashboard'));
    const res = await cb('code=good&state=abc', 'abc');
    expect(mockHandleGoogleCallback).toHaveBeenCalledWith('good');
    expect(res.headers.get('location')).toBe('http://app.test/dashboard');
    expect(res.headers.get('set-cookie')).toMatch(/oauth_state=;.*Path=\/api\/auth\/google/i);
  });
});
