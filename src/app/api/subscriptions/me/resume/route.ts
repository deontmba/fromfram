import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { SubscriptionStatus } from "@/generated/prisma/client";

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

    if (subscription.status !== SubscriptionStatus.PAUSED) {
      return NextResponse.json({ error: "Current status MUST be PAUSED to resume" }, { status: 400 });
    }

    const updatedSub = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        pausedUntil: null,
      },
    });

    return NextResponse.json({
      message: "Subscription resumed successfully",
      subscription: updatedSub,
    }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
