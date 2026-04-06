import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma"; // asumsi prisma instance diexport dari sini
import { getAuthenticatedUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { goalID, planType, servings } = body;

    if (!goalID || !planType || !servings || servings < 1 || servings > 6) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Cek apakah user sudah punya subscription aktif
    const existingSub = await prisma.subscription.findFirst({
      where: { userID: user.id, status: { not: "CANCELLED" } }
    });

    if (existingSub) {
      return NextResponse.json({ error: "User already has an active subscription" }, { status: 400 });
    }

    const newSubscription = await prisma.subscription.create({
      data: {
        userID: user.id,
        goalID,
        planType,
        servings,
        status: "ACTIVE",
        startDate: new Date(),
      },
    });

    return NextResponse.json(newSubscription, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
