/**
 * One-time script to fix subscriptions that were created with the old
 * @default(ACTIVE) schema before the fix to @default(UNPAID).
 *
 * This updates all ACTIVE subscriptions that have never had a completed
 * transaction (i.e. never paid) to UNPAID.
 */
import prisma from '../src/lib/prisma';

async function main() {
  // Find all ACTIVE subscriptions
  const activeSubscriptions = await prisma.subscription.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      userId: true,
      status: true,
      startDate: true,
      user: { select: { email: true, name: true } },
    },
  });

  console.log(`Found ${activeSubscriptions.length} ACTIVE subscription(s).`);

  if (activeSubscriptions.length === 0) {
    console.log('Nothing to fix.');
    return;
  }

  // Check which users have completed transactions (actual payments)
  for (const sub of activeSubscriptions) {
    const completedTransaction = await prisma.transaction.findFirst({
      where: { userId: sub.userId, status: 'COMPLETED' },
      select: { id: true },
    });

    if (completedTransaction) {
      console.log(
        `  ✓ SKIP ${sub.user.email} — has a completed payment, keeping ACTIVE.`
      );
    } else {
      console.log(
        `  ✗ FIX  ${sub.user.email} — no completed payment, updating to UNPAID.`
      );

      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'UNPAID' },
      });
    }
  }

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
