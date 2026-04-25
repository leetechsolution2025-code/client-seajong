import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "Không có file" }, { status: 400 });

    const allowedTypes = [
      "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
      "application/pdf", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",      // .xlsx
      "application/zip", "application/x-zip-compressed", "text/plain"
    ];
    if (file.type && !allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Định dạng file không được hỗ trợ" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Kích thước tối đa 10MB" }, { status: 400 });
    }

    const ext       = file.name.split(".").pop() ?? "bin";
    const fileName  = `att_${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    await mkdir(uploadDir, { recursive: true });

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(path.join(uploadDir, fileName), buffer);

    const publicPath = `/uploads/${fileName}`;
    return NextResponse.json({ url: publicPath });
  } catch (e) {
    console.error("[POST /api/upload]", e);
    return NextResponse.json({ error: "Lỗi upload" }, { status: 500 });
  }
}
