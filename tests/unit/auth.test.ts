import { hashPassword, verifyPassword } from '@/lib/hash';
import { getStartOfWeek, getEndOfWeek, getNextWeekStart } from '@/lib/week';

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
});
