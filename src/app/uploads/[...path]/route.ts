import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest, { params }: { params: any }) {
  try {
    const resolvedParams = await params;
    const filePathArray = resolvedParams.path;
    if (!filePathArray || filePathArray.length === 0) {
      return new NextResponse("Not Found - No Path", { status: 404 });
    }

    const relativePath = filePathArray.join("/");
    
    // First try storage/uploads
    let targetPath = path.join(process.cwd(), "storage", "uploads", relativePath);
    let fileStat;
    try {
      fileStat = await stat(targetPath);
    } catch (e) {
      // Fallback to public/uploads
      targetPath = path.join(process.cwd(), "public", "uploads", relativePath);
      try {
        fileStat = await stat(targetPath);
      } catch (err) {
        return new NextResponse("Not Found - No File", { status: 404 });
      }
    }

    if (!fileStat.isFile()) {
      return new NextResponse("Not Found - Not a file", { status: 404 });
    }

    const buffer = await readFile(targetPath);
    
    // basic mime types based on extension
    const ext = path.extname(targetPath).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".webp") contentType = "image/webp";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".svg") contentType = "image/svg+xml";
    else if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".docx") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    else if (ext === ".xlsx") contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    else if (ext === ".mp4") contentType = "video/mp4";
    else if (ext === ".webm") contentType = "video/webm";
    else if (ext === ".mp3") contentType = "audio/mpeg";
    else if (ext === ".wav") contentType = "audio/wav";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });

  } catch (err) {
    console.error("[GET /uploads]", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
