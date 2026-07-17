import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const db = prisma as any;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { fileLink, title, summary } = await req.json();
    if (!fileLink && !summary) return NextResponse.json({ error: 'Thiếu nội dung để lưu' }, { status: 400 });

    const userId = (session.user as any)?.id;
    const userName = (session.user as any)?.name;

    // 1. Tìm hoặc tạo folder cá nhân
    let personalFolder = await db.mediaFolder.findFirst({
      where: { ownerId: userId, parentId: null }
    });
    
    if (!personalFolder) {
      personalFolder = await db.mediaFolder.create({
        data: {
          name: userName || "Tài liệu của tôi",
          ownerId: userId,
          ownerName: userName,
          isPublic: false,
          ownerIsActive: true,
        }
      });
    }

    // 2. Fetch file hoặc tạo file từ text
    let buffer: Buffer;
    let ext: string;
    let mimeType: string;

    if (fileLink) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      const fileRes = await fetch(fileLink);
      if (!fileRes.ok) throw new Error("Không thể tải file từ Tổng cục Thuế");
      const arrayBuffer = await fileRes.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      ext = fileLink.split('.').pop()?.toLowerCase().split('?')[0] || 'pdf';
      mimeType = ext === 'pdf' ? 'application/pdf' : (ext === 'doc' || ext === 'docx' ? 'application/msword' : 'application/octet-stream');
    } else {
      // Nếu không có link đính kèm, lưu file text chứa tóm tắt
      const textContent = `Tiêu đề: ${title}\n\nNội dung phân tích AI:\n\n${summary}`;
      buffer = Buffer.from(textContent, 'utf8');
      ext = 'txt';
      mimeType = 'text/plain';
    }

    // 3. Chuẩn bị đường dẫn và lưu file
    const fileName = `thue_${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'media-library');
    await mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);
    const fileUrl = `/uploads/media-library/${fileName}`;

    // 4. Lưu vào MediaAsset
    const asset = await db.mediaAsset.create({
      data: {
        folderId: personalFolder.id,
        name: title || `Văn bản Thuế ${new Date().toLocaleDateString('vi-VN')}`,
        type: ext,
        fileUrl: fileUrl,
        fileSize: buffer.length,
        fileType: mimeType,
        uploadedBy: userId
      }
    });

    return NextResponse.json({ success: true, asset });
  } catch (error) {
    console.error("Save Document API Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
