import prisma from '@/lib/prisma';
import { PlanType, SubscriptionStatus, TransactionStatus } from '@prisma/client';

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
});
