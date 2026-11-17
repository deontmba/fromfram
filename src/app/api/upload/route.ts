import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getSessionUserId, getAuthErrorResponse } from "@/lib/session";
import { verifyRole } from "@/lib/auth";

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_BYTES = 5 * 1024 * 1024;

// shortcut: writes to local public/uploads, which is read-only on Vercel; move to object storage before relying on uploads in prod.
export async function POST(request: NextRequest) {
  const session = await getSessionUserId(request);
  if ("error" in session) return getAuthErrorResponse(session.error);
  const roleError = await verifyRole(session.userId, "NUTRITIONIST");
  if (roleError) return NextResponse.json({ error: roleError.error }, { status: roleError.status });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "File tidak ditemukan." },
        { status: 400 }
      );
    }

    // Extension comes from the checked MIME type, never from the user's filename.
    const extension = IMAGE_EXTENSIONS[file.type];
    if (!extension) {
      return NextResponse.json({ error: "Hanya file gambar (JPG, PNG, WEBP, GIF)." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Ukuran file maksimal 5 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Create unique filename
    const filename = `recipe-${crypto.randomUUID()}.${extension}`;
    
    // Ensure public/uploads directory exists
    const uploadDir = path.join(process.cwd(), "public/uploads");
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // Ignore if directory already exists
    }

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error("[UPLOAD API ERROR]", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengunggah file." },
      { status: 500 }
    );
  }
}
