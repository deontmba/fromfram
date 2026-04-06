import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/profile", "/subscription"];

// Routes that require ADMIN role
const ADMIN_ROUTES = ["/admin"];

// Routes that require NUTRITIONIST or ADMIN role
const NUTRITIONIST_ROUTES = ["/nutritionist"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAdmin = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  const isNutritionist = NUTRITIONIST_ROUTES.some((r) => pathname.startsWith(r));

  if (!isProtected && !isAdmin && !isNutritionist) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;

    if (isAdmin && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (isNutritionist && role !== "NUTRITIONIST" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  } catch {
    // Token invalid or expired
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/admin/:path*", "/nutritionist/:path*"],
};