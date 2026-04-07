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

    const body = await req.json();
    const { resumeDate } = body;

    // Validasi payload
    if (!resumeDate) {
      return NextResponse.json({ error: "Missing resumeDate" }, { status: 400 });
    }

    const parsedResumeDate = new Date(resumeDate);
    if (Number.isNaN(parsedResumeDate.getTime())) {
      return NextResponse.json({ error: "Invalid resumeDate" }, { status: 400 });
    }

    if (parsedResumeDate <= new Date()) {
      return NextResponse.json({ error: "resumeDate must be in the future" }, { status: 400 });
    }

    const maxResumeDateAllowed = new Date();
    maxResumeDateAllowed.setDate(maxResumeDateAllowed.getDate() + 28); // 4 minggu dari hari ini

    if (parsedResumeDate > maxResumeDateAllowed) {
      return NextResponse.json({ error: "resumeDate cannot exceed 4 weeks from today" }, { status: 400 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      return NextResponse.json({ error: "Current status MUST be ACTIVE to pause" }, { status: 400 });
    }

    const updatedSub = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.PAUSED,
        pausedUntil: parsedResumeDate,
      },
    });

    return NextResponse.json({
      message: "Subscription paused successfully",
      subscription: updatedSub,
      resumeDate: parsedResumeDate.toISOString(),
      note: "Use /api/subscriptions/me/resume untuk melanjutkan lebih cepat sebelum resumeDate.",
    }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
