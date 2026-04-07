import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { PlanType, SubscriptionStatus } from "@/generated/prisma/client";

function calculateCycleEndDate(startDate: Date, planType: PlanType): Date {
  const cycleEndDate = new Date(startDate);

  switch (planType) {
    case PlanType.MINGGUAN:
      cycleEndDate.setDate(cycleEndDate.getDate() + 7);
      break;
    case PlanType.BULANAN:
      cycleEndDate.setMonth(cycleEndDate.getMonth() + 1);
      break;
    case PlanType.TAHUNAN:
      cycleEndDate.setFullYear(cycleEndDate.getFullYear() + 1);
      break;
    default:
      cycleEndDate.setDate(cycleEndDate.getDate() + 7);
      break;
  }

  return cycleEndDate;
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Hanya ACTIVE atau PAUSED yang bisa dicancel
    if (
      subscription.status !== SubscriptionStatus.ACTIVE &&
      subscription.status !== SubscriptionStatus.PAUSED
    ) {
      return NextResponse.json({ error: "Cannot cancel a subscription that is not ACTIVE or PAUSED" }, { status: 400 });
    }

    const cycleEndDate = calculateCycleEndDate(
      subscription.startDate,
      subscription.planType,
    );


    const updatedSub = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        endDate: cycleEndDate,
        pausedUntil: null,
      },
    });

    // TODO: Buatlah atau daftarkan cronJob yang akan memeriksa setiap hari
    // Kapan saatnya `endDate <= todaysDate` dan otomatis merubah `status` jadi `CANCELLED`
    // cron.schedule("0 0 * * *", async () => { /* script */ });

    return NextResponse.json({
      message: "Subscription set for cancellation at the end of cycle",
      subscription: updatedSub,
      note: "Cron job is needed to update status to CANCELLED once endDate passes",
    }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
