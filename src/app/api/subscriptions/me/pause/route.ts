import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { setCache } from "@/lib/cache";

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

    const maxResumeDateAllowed = new Date();
    maxResumeDateAllowed.setDate(maxResumeDateAllowed.getDate() + 28); // 4 minggu dari hari ini
    const parsedResumeDate = new Date(resumeDate);

    if (parsedResumeDate > maxResumeDateAllowed) {
      return NextResponse.json({ error: "resumeDate cannot exceed 4 weeks from today" }, { status: 400 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (subscription.status !== "ACTIVE") {
      return NextResponse.json({ error: "Current status MUST be ACTIVE to pause" }, { status: 400 });
    }

    // Set Cache for resume date
    // Sebagai alternatif yang lebih baik, tambahkan kolom ke DB melalui prisma migrate pada iterasi berikutnya
    // Jika tidak ini bisa hilang saat server restart. Set value redis/in memory.
    setCache(`pause_resume_${subscription.id}`, parsedResumeDate.toISOString());

    const updatedSub = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "PAUSED" },
    });

    return NextResponse.json({
      message: "Subscription paused successfully",
      subscription: updatedSub,
      resumeDate: parsedResumeDate.toISOString(),
      note: "Ideally we need a Cron job reading the cache to resume or we add `resumeDate` in DB schema.",
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
