import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

type AuthenticatedUser = {
  id: string;
  email: string;
  role: string;
};

function getBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (!scheme || !token) {
    return null;
  }

  if (scheme.toLowerCase() !== "bearer") {
    return null;
  }

  const trimmedToken = token.trim();
  return trimmedToken.length > 0 ? trimmedToken : null;
}

/**
 * Minimal auth helper for development/testing.
 *
 * Supported headers:
 * - x-user-id: <userId>
 * - x-user-email: <email>
 * - Authorization: Bearer <userId>
 */
export async function getAuthenticatedUser(
  req: NextRequest,
): Promise<AuthenticatedUser | null> {
  const userIdHeader = req.headers.get("x-user-id")?.trim() || null;
  const userEmailHeader = req.headers.get("x-user-email")?.trim() || null;
  const bearerToken = getBearerToken(req.headers.get("authorization"));

  const userId = userIdHeader || bearerToken;

  if (userId) {
    const userById = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!userById) {
      return null;
    }

    return {
      ...userById,
      role: userById.role,
    };
  }

  if (userEmailHeader) {
    const userByEmail = await prisma.user.findUnique({
      where: { email: userEmailHeader },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!userByEmail) {
      return null;
    }

    return {
      ...userByEmail,
      role: userByEmail.role,
    };
  }

  return null;
}
