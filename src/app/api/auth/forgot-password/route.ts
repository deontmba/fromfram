import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return NextResponse.json({ message: "Jika email terdaftar, link reset telah dikirim." });
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });

    const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    const { data, error } = await resend.emails.send({
      from: "FromFram <onboarding@resend.dev>",
      to: email,
      subject: "Reset Password - FromFram",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Reset Password</h2>
          <p>Anda menerima email ini karena ada permintaan untuk mereset password akun FromFram Anda.</p>
          <p>Klik tombol di bawah ini untuk mereset password Anda:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #1abb89; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
          <p style="margin-top: 20px;">Link ini akan kadaluarsa dalam 1 jam.</p>
          <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
        </div>
      `,
    });

    // Logging the link for local testing, especially if Resend sandbox blocks the email
    console.log("==========================================");
    console.log("RESET LINK:", resetLink);
    if (error) {
      console.error("Resend API Error:", error);
    } else {
      console.log("Resend Success:", data);
    }
    console.log("==========================================");

    return NextResponse.json({ message: "Jika email terdaftar, link reset telah dikirim." });
  } catch (error) {
    console.error("[FORGOT_PASSWORD_ERROR]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
