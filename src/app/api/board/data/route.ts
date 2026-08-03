import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";

const BACKUP_DIR = path.join(process.cwd(), "backup_data");

// Lấy tên file DB thực tế từ biến môi trường (hỗ trợ cả đường dẫn tương đối và tuyệt đối)
const dbUrl = process.env.DATABASE_URL || "file:./prod.db";
// Tách lấy phần tên file cuối cùng (vd: prod.db hoặc dev.db)
const dbFileName = dbUrl.split('/').pop() || "prod.db";
const DB_FILE = path.join(process.cwd(), "prisma", dbFileName);

// Helper to format bytes
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // Only directors or superadmins should access this
    if (session.user.role !== "SUPERADMIN" && !session.user.positionName?.toLowerCase().includes("giám đốc")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const downloadFile = searchParams.get("download");

    if (downloadFile) {
      // Validate filename to prevent path traversal
      const safeFilename = path.basename(downloadFile);
      const filePath = path.join(BACKUP_DIR, safeFilename);

      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Disposition": `attachment; filename="${safeFilename}"`,
          "Content-Type": "application/octet-stream",
          "Content-Length": fileBuffer.length.toString(),
        },
      });
    }

    // Ensure directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // List files
    const files = fs.readdirSync(BACKUP_DIR).filter(file => file.endsWith(".db"));
    const backups = files.map(file => {
      const stats = fs.statSync(path.join(BACKUP_DIR, file));
      return {
        name: file,
        size: formatBytes(stats.size),
        createdAt: stats.birthtime,
      };
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({ backups });
  } catch (error: any) {
    console.error("[Data Backup GET Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    if (session.user.role !== "SUPERADMIN" && !session.user.positionName?.toLowerCase().includes("giám đốc")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if original DB exists
    if (!fs.existsSync(DB_FILE)) {
      return NextResponse.json({ error: "Database file not found" }, { status: 404 });
    }

    // Ensure directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Generate filename
    const now = new Date();
    const timestamp = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
    const backupFilename = `manual_backup_${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupFilename);

    // Copy file
    fs.copyFileSync(DB_FILE, backupPath);

    return NextResponse.json({ success: true, filename: backupFilename });
  } catch (error: any) {
    console.error("[Data Backup POST Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    if (session.user.role !== "SUPERADMIN" && !session.user.positionName?.toLowerCase().includes("giám đốc")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json({ error: "Filename required" }, { status: 400 });
    }

    const safeFilename = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Data Backup DELETE Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    if (session.user.role !== "SUPERADMIN" && !session.user.positionName?.toLowerCase().includes("giám đốc")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { filename } = await req.json();

    if (!filename) {
      return NextResponse.json({ error: "Filename required" }, { status: 400 });
    }

    const safeFilename = path.basename(filename);
    const backupFilePath = path.join(BACKUP_DIR, safeFilename);

    if (!fs.existsSync(backupFilePath)) {
      return NextResponse.json({ error: "File backup không tồn tại" }, { status: 404 });
    }

    // 1. Tạo bản sao lưu khẩn cấp (before_restore)
    const now = new Date();
    const timestamp = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
    const emergencyBackupPath = path.join(BACKUP_DIR, `before_restore_${timestamp}.db`);
    fs.copyFileSync(DB_FILE, emergencyBackupPath);

    // 2. Ghi đè file DB hiện tại bằng file backup
    fs.copyFileSync(backupFilePath, DB_FILE);

    // 3. Khởi động lại hệ thống bằng cách thoái lui tiến trình (PM2 sẽ tự gọi lại)
    setTimeout(() => {
      console.warn("=== SYSTEM RESTART TRIGERRED BY DATABASE RESTORE ===");
      process.exit(1);
    }, 1500);

    return NextResponse.json({ success: true, message: "Phục hồi thành công, hệ thống đang khởi động lại..." });
  } catch (error: any) {
    console.error("[Data Backup PUT Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
