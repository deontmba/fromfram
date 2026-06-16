import prisma from '@/lib/prisma';
import { PlanType, SubscriptionStatus, TransactionStatus } from '@prisma/client';
import { createSubscriptionSchema } from '@/schemas/subscriptionSchema';
import { updateHealthSchema } from '@/schemas/profileSchema';
import { addAddressSchema } from '@/schemas/addressSchema';

describe('Subscription & Transaction Operations (White Box Testing)', () => {
  let testUser: any;
  let testGoal: any;

  beforeAll(async () => {
    // Setup test user
    testUser = await prisma.user.upsert({
      where: { email: 'test_subscriber@fromfram.test' },
      update: {},
      create: {
        email: 'test_subscriber@fromfram.test',
        name: 'Test Subscriber',
        role: 'USER',
        isVerified: true,
      },
    });

    // Setup test goal
    testGoal = await prisma.goal.upsert({
      where: { name: 'Test Goal' },
      update: {},
      create: {
        name: 'Test Goal',
        description: 'For testing purposes',
        minCalories: 400,
        maxCalories: 600,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.subscription.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.transaction.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
  });

  it('should successfully create a subscription with UNPAID status', async () => {
    const sub = await prisma.subscription.create({
      data: {
        userId: testUser.id,
        goalId: testGoal.id,
        planType: PlanType.MINGGUAN,
        servings: 2,
        status: SubscriptionStatus.UNPAID,
      },
    });

    expect(sub).toBeDefined();
    expect(sub.userId).toEqual(testUser.id);
    expect(sub.status).toEqual(SubscriptionStatus.UNPAID);
  });

  it('should process simulated QRIS transaction and set subscription to ACTIVE', async () => {
    // 1. Create Transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: testUser.id,
        amount: 150000,
        status: TransactionStatus.PENDING,
        qrisCode: 'TEST-QRIS-CODE',
      },
    });

    expect(transaction.status).toEqual(TransactionStatus.PENDING);

    // 2. Simulate Payment Success (webhook behavior)
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.COMPLETED,
        paidAt: new Date(),
      },
    });

    expect(updatedTransaction.status).toEqual(TransactionStatus.COMPLETED);

    // 3. Update Subscription to ACTIVE
    const activeSub = await prisma.subscription.update({
      where: { userId: testUser.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
      },
    });

    expect(activeSub.status).toEqual(SubscriptionStatus.ACTIVE);
  });

  // PENINGKATAN TEST CASES: Memecah pengujian menjadi skenario terpisah (granuler)
  describe('Subscription Plan Types - Validation Checking', () => {
    it('should validate successfully with correct subscription inputs', () => {
      const result = createSubscriptionSchema.safeParse({
        goalId: 'goal-uuid-123',
        planType: 'MINGGUAN',
        servings: 2,
      });
      expect(result.success).toBe(true);
    });

    it('should fail if planType is invalid', () => {
      const result = createSubscriptionSchema.safeParse({
        goalId: 'goal-uuid-123',
        planType: 'HUJAN_HARIAN',
        servings: 2,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toEqual('planType tidak valid.');
      }
    });

    it('should fail if goalId is empty', () => {
      const result = createSubscriptionSchema.safeParse({
        goalId: '',
        planType: 'MINGGUAN',
        servings: 2,
      });
      expect(result.success).toBe(false);
    });

    it('should fail if planType is missing', () => {
      const result = createSubscriptionSchema.safeParse({
        goalId: 'goal-uuid-123',
        servings: 2,
      } as any);
      expect(result.success).toBe(false);
    });
  });

  describe('Subscription Servings - Validation Checking', () => {
    it('should fail if serving size is less than 1', () => {
      const result = createSubscriptionSchema.safeParse({
        goalId: 'goal-uuid-123',
        planType: 'MINGGUAN',
        servings: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should fail if serving size is greater than 6', () => {
      const result = createSubscriptionSchema.safeParse({
        goalId: 'goal-uuid-123',
        planType: 'MINGGUAN',
        servings: 7,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toEqual('Servings maksimal 6.');
      }
    });

    it('should fail if servings is not a number', () => {
      const result = createSubscriptionSchema.safeParse({
        goalId: 'goal-uuid-123',
        planType: 'MINGGUAN',
        servings: 'three' as any,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Nutrition Profile - Weight Validation', () => {
    it('should validate successfully with correct health profile details', () => {
      const result = updateHealthSchema.safeParse({
        weight: 65,
        height: 170,
        allergies: 'Kacang, Seafood',
        medicalNotes: 'Ada riwayat maag',
      });
      expect(result.success).toBe(true);
    });

    it('should fail if weight is zero', () => {
      const result = updateHealthSchema.safeParse({
        weight: 0,
        height: 170,
      });
      expect(result.success).toBe(false);
    });

    it('should fail if weight is negative', () => {
      const result = updateHealthSchema.safeParse({
        weight: -12,
        height: 170,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toEqual('Berat badan harus berupa angka positif.');
      }
    });

    it('should fail if weight is not provided', () => {
      const result = updateHealthSchema.safeParse({
        height: 170,
      } as any);
      expect(result.success).toBe(false);
    });
  });

  describe('Nutrition Profile - Height Validation', () => {
    it('should fail if height is zero', () => {
      const result = updateHealthSchema.safeParse({
        weight: 65,
        height: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should fail if height is negative', () => {
      const result = updateHealthSchema.safeParse({
        weight: 65,
        height: -5,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toEqual('Tinggi badan harus berupa angka positif.');
      }
    });

    it('should fail if height is not provided', () => {
      const result = updateHealthSchema.safeParse({
        weight: 65,
      } as any);
      expect(result.success).toBe(false);
    });
  });

  describe('Address Validation - Fields Verification', () => {
    it('should succeed with complete address, city, province, and postal code', () => {
      const result = addAddressSchema.safeParse({
        label: 'Kantor',
        street: 'Jl. Jenderal Sudirman No. 10',
        city: 'Jakarta Selatan',
        province: 'DKI Jakarta',
        postalCode: '12190',
        isDefault: true,
      });
      expect(result.success).toBe(true);
    });

    it('should fail validation when label is missing', () => {
      const result = addAddressSchema.safeParse({
        street: 'Jl. Jenderal Sudirman No. 10',
        city: 'Jakarta Selatan',
        province: 'DKI Jakarta',
        postalCode: '12190',
      } as any);
      expect(result.success).toBe(false);
    });

    it('should fail validation when street is missing', () => {
      const result = addAddressSchema.safeParse({
        label: 'Kantor',
        city: 'Jakarta Selatan',
        province: 'DKI Jakarta',
        postalCode: '12190',
      } as any);
      expect(result.success).toBe(false);
    });

    it('should fail validation when city is missing', () => {
      const result = addAddressSchema.safeParse({
        label: 'Kantor',
        street: 'Jl. Jenderal Sudirman No. 10',
        province: 'DKI Jakarta',
        postalCode: '12190',
      } as any);
      expect(result.success).toBe(false);
    });

    it('should fail validation when postalCode is missing', () => {
      const result = addAddressSchema.safeParse({
        label: 'Kantor',
        street: 'Jl. Jenderal Sudirman No. 10',
        city: 'Jakarta Selatan',
        province: 'DKI Jakarta',
      } as any);
      expect(result.success).toBe(false);
    });

    it('should successfully mock a default address swap validation', () => {
      const mockAddresses = [
        { id: '1', isDefault: true },
        { id: '2', isDefault: false },
      ];
      
      const activeId = '2';
      const updated = mockAddresses.map(addr => ({
        ...addr,
        isDefault: addr.id === activeId,
      }));
      
      expect(updated[0].isDefault).toBe(false);
      expect(updated[1].isDefault).toBe(true);
    });
  });
});

