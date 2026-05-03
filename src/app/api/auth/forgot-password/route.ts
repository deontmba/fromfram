import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Pastikan path ini sesuai dengan letak file prisma kamu
import { randomBytes } from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Jangan beritahu secara eksplisit jika email tidak ada
    // Ini praktik keamanan yang baik untuk mencegah orang menebak-nebak email user lain
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Generate token random 32 byte
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // Token berlaku 1 jam

    // Simpan token ke database
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // --- FIX UTAMA DI SINI ---
    // Gunakan fallback ke localhost:3000 jika NEXT_PUBLIC_APP_URL gagal dibaca dari .env
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    // Kirim email via Resend
    await resend.emails.send({
      from: "FromFram <onboarding@resend.dev>", 
      to: email,
      subject: "Reset Password - FromFram",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #111;">Halo, ${user.name}</h2>
          <p>Kami menerima permintaan untuk mereset password akun FromFram kamu.</p>
          <p>Klik tombol di bawah ini untuk membuat password baru. Link ini hanya berlaku selama 1 jam.</p>
          <div style="margin: 30px 0;">
            <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background-color:#1abb89;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Jika kamu tidak meminta reset password, kamu bisa mengabaikan email ini dengan aman.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}