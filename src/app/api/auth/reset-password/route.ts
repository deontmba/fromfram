// src/app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Cari token di database
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    // Validasi token ada dan belum kedaluwarsa
    if (!resetToken || resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Token tidak valid atau sudah kedaluwarsa" },
        { status: 400 }
      );
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password user
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // Hapus token yang sudah digunakan
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}