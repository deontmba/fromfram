import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUserId(req);
    if ("error" in session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = session;
    const body = await req.json();
    const { goals, dietaryPrefs, allergies, weight, height, age, cookingPrefs } = body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.hasCompletedOnboarding) {
      return NextResponse.json(
        { message: "User already completed onboarding" },
        { status: 200 }
      );
    }

    // Prepare tags arrays safely
    const safeGoals = Array.isArray(goals) ? goals : [];
    const safeDietary = Array.isArray(dietaryPrefs) ? dietaryPrefs : [];
    const safeAllergies = Array.isArray(allergies) ? allergies : [];
    const safeCooking = Array.isArray(cookingPrefs) ? cookingPrefs : [];

    await prisma.$transaction([
      prisma.userPersonalization.upsert({
        where: { userId },
        update: {
          goals: safeGoals,
          dietaryPrefs: safeDietary,
          allergies: safeAllergies,
          cookingPrefs: safeCooking,
          weight: weight ? parseFloat(weight) : null,
          height: height ? parseFloat(height) : null,
          age: age ? parseInt(age, 10) : null,
        },
        create: {
          userId,
          goals: safeGoals,
          dietaryPrefs: safeDietary,
          allergies: safeAllergies,
          cookingPrefs: safeCooking,
          weight: weight ? parseFloat(weight) : null,
          height: height ? parseFloat(height) : null,
          age: age ? parseInt(age, 10) : null,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { hasCompletedOnboarding: true },
      }),
    ]);

    return NextResponse.json(
      { success: true, message: "Onboarding completed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PERSONALIZATION_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
