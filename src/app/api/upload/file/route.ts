import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Không có file" }, { status: 400 });
    }

    // Giới hạn 20MB
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File quá lớn (tối đa 20MB)" }, { status: 400 });
    }

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Tạo thư mục uploads nếu chưa có
    const uploadDir = path.join(process.cwd(), "public", "uploads", "messages");
    await mkdir(uploadDir, { recursive: true });

    // Tên file unique
    const ext      = path.extname(file.name);
    const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 40);
    const fileName = `${Date.now()}_${baseName}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    const url = `/uploads/messages/${fileName}`;
    return NextResponse.json({ url, name: file.name, size: file.size, type: file.type });

  } catch (err: any) {
    console.error("[POST /api/upload/file]", err);
    return NextResponse.json({ error: err?.message || "Lỗi upload" }, { status: 500 });
  }
}
