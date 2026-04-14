import { NextRequest, NextResponse } from "next/server";
import prisma  from "@/lib/prisma";
import bcrypt from "bcrypt";

/**
 * API Documentation
 * Endpoint   : POST /api/auth/register
 * Deskripsi  : Registrasi pengguna baru.
 * Method     : POST
 * Input      : JSON body { name: string, email: string, password: string }
 * Proses     :
 * 1) Validasi seluruh field wajib terisi.
 * 2) Cek apakah email sudah digunakan.
 * 3) Hash password dengan bcrypt.
 * 4) Simpan user ke database (Prisma).
 * 5) Kembalikan data user terpilih tanpa password.
 */
 
export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();
 
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }
 
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use." },
        { status: 409 }
      );
    }
 
    const hashedPassword = await bcrypt.hash(password, 12);
 
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, name: true, email: true, createdAt: true },
    });
 
    return NextResponse.json(
      { message: "User created successfully.", user },
      { status: 201 }
    );
  } catch (error) {
    console.error("[REGISTER ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}