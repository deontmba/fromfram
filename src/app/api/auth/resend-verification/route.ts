import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Minimal stub to satisfy imports during dev/build.
  try {
    return NextResponse.json({ message: "ok" });
  } catch (err) {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ message: "ok" });
}
