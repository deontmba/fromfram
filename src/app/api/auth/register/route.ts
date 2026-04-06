// src/app/api/register/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
    const { email, password, name } = await req.json();
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create record
    const user = await prisma.user.create({
        data: { email, name, password: hashedPassword }
    });

    return NextResponse.json({ success: true, id: user.id });
}