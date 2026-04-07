import { NextRequest, NextResponse } from "next/server";
import  prisma from "@/lib/prisma";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

/**
 * API Documentation
 * Endpoint   : GET /api/auth/me
 * Deskripsi  : Mengambil data profil user yang sedang login berdasarkan cookie token.
 * Method     : GET
 * Input      : Cookie `token` (JWT) pada request.
 * Proses     :
 * 1) Ambil token dari cookie.
 * 2) Verifikasi JWT.
 * 3) Ambil data user dari database berdasarkan `payload.id`.
 * 4) Kembalikan data user terpilih.
 */

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: payload.id as string },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error("[ME ERROR]", error);
    return NextResponse.json(
      { error: "Invalid or expired token." },
      { status: 401 }
    );
  }
}