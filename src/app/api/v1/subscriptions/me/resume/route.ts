import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { deleteCache } from "@/lib/cache"; // Fungsi yang kita import jika dari redis/cache layer

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userID: user.id },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (subscription.status !== "PAUSED") {
      return NextResponse.json({ error: "Current status MUST be PAUSED to resume" }, { status: 400 });
    }

    // Hapus data resume date yang sementara 
    deleteCache(`pause_resume_${subscription.id}`);

    const updatedSub = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "ACTIVE" },
    });

    return NextResponse.json({
      message: "Subscription resumed successfully",
      subscription: updatedSub,
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
