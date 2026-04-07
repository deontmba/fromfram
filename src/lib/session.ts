import { jwtVerify } from "jose";
import { NextRequest } from "next/server";

type SessionError = "CONFIG_MISSING" | "UNAUTHENTICATED";

export type SessionUserResult =
  | { userId: string }
  | { error: SessionError };

export async function getSessionUserId(
  req: NextRequest
): Promise<SessionUserResult> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return { error: "CONFIG_MISSING" };
  }

  const token = req.cookies.get("token")?.value;
  if (!token) {
    return { error: "UNAUTHENTICATED" };
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    const userId = payload.id;

    if (typeof userId !== "string" || userId.length === 0) {
      return { error: "UNAUTHENTICATED" };
    }

    return { userId };
  } catch {
    return { error: "UNAUTHENTICATED" };
  }
}