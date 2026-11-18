import { createHash } from 'crypto';

const mockPrisma = {
  user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  passwordResetToken: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
};
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));

const mockSendReset = jest.fn();
jest.mock('@/lib/email', () => ({ sendPasswordResetEmail: (...a: unknown[]) => mockSendReset(...a) }));
jest.mock('@/lib/jwt', () => ({
  createJwtToken: jest.fn(async () => 'jwt'),
  setAuthCookie: (res: unknown) => res,
}));

import { forgotPassword, handleGoogleCallback, resetPassword } from '@/controllers/authController';
import { jakartaDayOfWeek } from '@/lib/week';

const sha256 = (t: string) => createHash('sha256').update(t).digest('hex');

beforeEach(() => jest.clearAllMocks());

describe('password reset tokens', () => {
  it('stores only the hash and emails the raw token', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    await forgotPassword('a@b.co');
    const raw = mockSendReset.mock.calls[0][1] as string;
    const stored = mockPrisma.passwordResetToken.create.mock.calls[0][0].data.token;
    expect(stored).toBe(sha256(raw));
    expect(stored).not.toBe(raw);
  });

  it('looks up the reset token by its hash', async () => {
    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({ userId: 'u1', expiresAt: new Date(Date.now() + 60_000) });
    const res = await resetPassword('raw-token', 'newpassword123');
    expect(res.status).toBe(200);
    expect(mockPrisma.passwordResetToken.findUnique).toHaveBeenCalledWith({ where: { token: sha256('raw-token') } });
  });
});

describe('Google login linking', () => {
  const googleFetch = (user: Record<string, unknown>) => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'at' }) })
      .mockResolvedValueOnce({ json: async () => user }) as unknown as typeof fetch;
  };
  const googleUser = { sub: 'g1', email: 'v@x.co', email_verified: true, name: 'V' };

  it('clears the password of an unverified account it links to', async () => {
    googleFetch(googleUser);
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1', googleId: null, isVerified: false });
    mockPrisma.user.update.mockResolvedValue({ id: 'u1', email: 'v@x.co', role: 'USER' });
    await handleGoogleCallback('code');
    expect(mockPrisma.user.update.mock.calls[0][0].data.password).toBeNull();
  });

  it('keeps the password of a verified account', async () => {
    googleFetch(googleUser);
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1', googleId: null, isVerified: true });
    mockPrisma.user.update.mockResolvedValue({ id: 'u1', email: 'v@x.co', role: 'USER' });
    await handleGoogleCallback('code');
    expect(mockPrisma.user.update.mock.calls[0][0].data).not.toHaveProperty('password');
  });

  it('rejects a Google email that Google has not verified', async () => {
    googleFetch({ ...googleUser, email_verified: false });
    const res = await handleGoogleCallback('code');
    expect(res.headers.get('location')).toContain('error=google_no_email');
    expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
  });
});

describe('jakartaDayOfWeek', () => {
  it('uses the Jakarta day, not UTC', () => {
    // Monday 01:00 WIB is still Sunday in UTC.
    expect(jakartaDayOfWeek(new Date('2026-11-08T18:00:00Z'))).toBe('SENIN');
    expect(jakartaDayOfWeek(new Date('2026-11-08T16:59:00Z'))).toBe('MINGGU');
  });
});
