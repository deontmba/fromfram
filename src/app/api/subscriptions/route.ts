import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma"; // asumsi prisma instance diexport dari sini
import { getAuthenticatedUser } from "@/lib/auth";
import {
  PlanType,
  SubscriptionStatus,
} from "@/generated/prisma/client";

const PLAN_TYPE_MAP: Record<string, PlanType> = {
  MINGGUAN: PlanType.MINGGUAN,
  BULANAN: PlanType.BULANAN,
  TAHUNAN: PlanType.TAHUNAN,
};

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const goalId = body.goalId ?? body.goalID;
    const planTypeInput =
      typeof body.planType === "string" ? body.planType.toUpperCase().trim() : "";
    const planType = PLAN_TYPE_MAP[planTypeInput];
    const servings = Number(body.servings);

    if (!goalId || !planType || !Number.isInteger(servings) || servings < 1 || servings > 6) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      select: { id: true },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 400 });
    }

    const existingSub = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (existingSub && existingSub.status !== SubscriptionStatus.CANCELLED) {
      return NextResponse.json({ error: "User already has an active subscription" }, { status: 400 });
    }

    const commonData = {
      goalId,
      planType,
      servings,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(),
      endDate: null,
      pausedUntil: null,
    };

    if (existingSub && existingSub.status === SubscriptionStatus.CANCELLED) {
      const reactivatedSubscription = await prisma.subscription.update({
        where: { id: existingSub.id },
        data: commonData,
      });

      return NextResponse.json(reactivatedSubscription, { status: 200 });
    }

    const newSubscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        ...commonData,
      },
    });

    return NextResponse.json(newSubscription, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
