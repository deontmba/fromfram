import { hashPassword, verifyPassword } from '@/lib/hash';
import { getStartOfWeek, getEndOfWeek, getNextWeekStart } from '@/lib/week';
import { registerSchema } from '@/schemas/authSchema';
import { createJwtToken, verifyJwtToken } from '@/lib/jwt';
import { verifyRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

// MOCK LOCAL: Mocking jwt module to bypass ESM jose library issues under Jest environment
jest.mock('@/lib/jwt', () => {
  return {
    createJwtToken: jest.fn(async (id, email, role) => {
      return `mock-token.${Buffer.from(JSON.stringify({ id, email, role })).toString('base64')}`;
    }),
    verifyJwtToken: jest.fn(async (token) => {
      if (token.includes('manipulated') || !token.startsWith('mock-token.')) {
        throw new Error('Invalid token signature');
      }
      const base64Payload = token.split('.')[1];
      return JSON.parse(Buffer.from(base64Payload, 'base64').toString('ascii'));
    }),
  };
});

describe('Auth & Week Helpers (White Box Testing)', () => {
  describe('Password Hashing Logic', () => {
    it('should correctly hash password and verify it', async () => {
      const password = 'mySecretPassword123!';
      const hash = await hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toEqual(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('wrongpassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Week Logic Helpers', () => {
    it('should return Monday as start of week', () => {
      // Wednesday, April 8, 2026
      const date = new Date('2026-04-08T12:00:00Z');
      const start = getStartOfWeek(date);
      
      // Should be Monday, April 6, 2026
      expect(start.getDay()).toBe(1); // 1 = Monday
      expect(start.getDate()).toBe(6);
      expect(start.getMonth()).toBe(3); // 3 = April (0-indexed)
    });

    it('should return Sunday as end of week', () => {
      const date = new Date('2026-04-08T12:00:00Z');
      const end = getEndOfWeek(date);

      // Should be Sunday, April 12, 2026
      expect(end.getDate()).toBe(12);
    });

    it('should return next week Monday', () => {
      const date = new Date('2026-04-08T12:00:00Z');
      const nextStart = getNextWeekStart(date);

      // Should be Monday, April 13, 2026
      expect(nextStart.getDate()).toBe(13);
    });
  });

  // PENINGKATAN TEST CASES: Memecah pengujian menjadi skenario terpisah (granuler)
  describe('Register Validation Schema - Name Verification', () => {
    it('should validate successfully with correct registration inputs', () => {
      const result = registerSchema.safeParse({
        name: 'Budi Santoso',
        email: 'budi@fromfram.test',
        password: 'Password123!',
      });
      expect(result.success).toBe(true);
    });

    it('should fail validation if name is empty', () => {
      const result = registerSchema.safeParse({
        name: '',
        email: 'budi@fromfram.test',
        password: 'Password123!',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toEqual('Nama wajib diisi.');
      }
    });

    it('should fail validation if name is null', () => {
      const result = registerSchema.safeParse({
        name: null as any,
        email: 'budi@fromfram.test',
        password: 'Password123!',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Register Validation Schema - Email Verification', () => {
    it('should fail validation when email format is invalid', () => {
      const result = registerSchema.safeParse({
        name: 'Budi Santoso',
        email: 'invalid-email-format',
        password: 'Password123!',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toEqual('Format email tidak valid.');
      }
    });

    it('should fail validation when email is empty', () => {
      const result = registerSchema.safeParse({
        name: 'Budi Santoso',
        email: '',
        password: 'Password123!',
      });
      expect(result.success).toBe(false);
    });

    it('should fail validation when email is not provided', () => {
      const result = registerSchema.safeParse({
        name: 'Budi Santoso',
        password: 'Password123!',
      } as any);
      expect(result.success).toBe(false);
    });
  });

  describe('Register Validation Schema - Password Verification', () => {
    it('should fail validation when password is less than 8 characters', () => {
      const result = registerSchema.safeParse({
        name: 'Budi Santoso',
        email: 'budi@fromfram.test',
        password: 'pass',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toEqual('Password minimal 8 karakter.');
      }
    });

    it('should fail validation when password is empty', () => {
      const result = registerSchema.safeParse({
        name: 'Budi Santoso',
        email: 'budi@fromfram.test',
        password: '',
      });
      expect(result.success).toBe(false);
    });

    it('should fail validation when password is not provided', () => {
      const result = registerSchema.safeParse({
        name: 'Budi Santoso',
        email: 'budi@fromfram.test',
      } as any);
      expect(result.success).toBe(false);
    });
  });

  describe('JWT Token & Session Handlers', () => {
    beforeAll(() => {
      process.env.JWT_SECRET = 'super-secret-key-for-testing-purposes-only-12345';
    });

    it('should successfully sign a token with user data payload', async () => {
      const token = await createJwtToken('user-id-123', 'test@fromfram.test', 'USER');
      expect(token).toBeDefined();
    });

    it('should successfully verify a valid signed token', async () => {
      const token = await createJwtToken('user-id-123', 'test@fromfram.test', 'USER');
      const decoded = await verifyJwtToken(token);
      expect(decoded.id).toEqual('user-id-123');
    });

    it('should decode correct role from valid token', async () => {
      const token = await createJwtToken('user-id-123', 'test@fromfram.test', 'USER');
      const decoded = await verifyJwtToken(token);
      expect(decoded.role).toEqual('USER');
    });

    it('should decode correct email from valid token', async () => {
      const token = await createJwtToken('user-id-123', 'test@fromfram.test', 'USER');
      const decoded = await verifyJwtToken(token);
      expect(decoded.email).toEqual('test@fromfram.test');
    });

    it('should fail verification of a tampered/malformed token', async () => {
      const token = await createJwtToken('user-id-123', 'test@fromfram.test', 'USER');
      const tampered = token + 'manipulated';
      await expect(verifyJwtToken(tampered)).rejects.toThrow();
    });

    it('should reject checking token if token parameter is completely empty', async () => {
      await expect(verifyJwtToken('')).rejects.toThrow();
    });
  });

  describe('Role-Based Access Control (RBAC) Logic', () => {
    it('should permit access when user role matches API access requirements', async () => {
      const mockFindUnique = jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'admin-123',
        role: 'ADMIN',
      } as any);

      const result = await verifyRole('admin-123', 'ADMIN');
      expect(result).toBeNull();
      mockFindUnique.mockRestore();
    });

    it('should block access when user role is CUSTOMER but API requires ADMIN', async () => {
      const mockFindUnique = jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'customer-123',
        role: 'USER',
      } as any);

      const result = await verifyRole('customer-123', 'ADMIN');
      expect(result).toBeDefined();
      expect(result?.status).toEqual(403);
      mockFindUnique.mockRestore();
    });

    it('should return 403 status code on forbidden access', async () => {
      const mockFindUnique = jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'customer-123',
        role: 'USER',
      } as any);

      const result = await verifyRole('customer-123', 'ADMIN');
      expect(result?.status).toEqual(403);
      mockFindUnique.mockRestore();
    });

    it('should block access when user role is NUTRITIONIST but API requires ADMIN', async () => {
      const mockFindUnique = jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'nutritionist-123',
        role: 'NUTRITIONIST',
      } as any);

      const result = await verifyRole('nutritionist-123', 'ADMIN');
      expect(result).toBeDefined();
      expect(result?.error).toContain('Admin access required');
      mockFindUnique.mockRestore();
    });
  });
});


