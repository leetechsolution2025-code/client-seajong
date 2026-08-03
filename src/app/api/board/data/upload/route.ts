import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";

const BACKUP_DIR = path.join(process.cwd(), "backup_data");

// Lấy tên file DB thực tế từ biến môi trường
const dbUrl = process.env.DATABASE_URL || "file:./prod.db";
const dbFileName = dbUrl.split('/').pop() || "prod.db";
const DB_FILE = path.join(process.cwd(), "prisma", dbFileName);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    if (session.user.role !== "SUPERADMIN" && !session.user.positionName?.toLowerCase().includes("giám đốc")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy file tải lên" }, { status: 400 });
    }

    if (!file.name.endsWith(".db")) {
      return NextResponse.json({ error: "Định dạng file không hợp lệ (phải là .db)" }, { status: 400 });
    }

    // 1. Lưu file tạm vào backup_data
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    const now = new Date();
    const timestamp = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
    const uploadedFilePath = path.join(BACKUP_DIR, `uploaded_backup_${timestamp}.db`);
    
    // Read file buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(uploadedFilePath, buffer);

    // 2. Tạo bản sao lưu khẩn cấp (before_restore)
    const emergencyBackupPath = path.join(BACKUP_DIR, `before_restore_${timestamp}.db`);
    if (fs.existsSync(DB_FILE)) {
      fs.copyFileSync(DB_FILE, emergencyBackupPath);
    }

    // 3. Ghi đè file DB hiện tại bằng file vừa tải lên
    fs.copyFileSync(uploadedFilePath, DB_FILE);

    // 4. Khởi động lại hệ thống bằng cách thoái lui tiến trình (PM2 sẽ tự gọi lại)
    setTimeout(() => {
      console.warn("=== SYSTEM RESTART TRIGERRED BY UPLOAD DATABASE RESTORE ===");
      process.exit(1);
    }, 1500);

    return NextResponse.json({ success: true, message: "Upload & Phục hồi thành công, hệ thống đang khởi động lại..." });
  } catch (error: any) {
    console.error("[Data Backup Upload Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
