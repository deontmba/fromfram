import { NextResponse } from "next/server";

/**
 * API Documentation
 * Endpoint   : POST /api/auth/logout
 * Deskripsi  : Logout pengguna dengan menghapus cookie token.
 * Method     : POST
 * Input      : Tidak ada body.
 * Proses     :
 * 1) Buat response sukses.
 * 2) Set cookie `token` menjadi kosong dengan `maxAge: 0`.
 * 3) Kirim response logout.
 */

export async function POST() {
  const response = NextResponse.json(
    { message: "Logged out successfully." },
    { status: 200 }
  );

  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}