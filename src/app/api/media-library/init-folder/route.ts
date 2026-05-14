import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const db = prisma as any;

function isAdmin(s: any) { return s?.user?.role === 'SUPERADMIN' || s?.user?.role === 'ADMIN'; }
function isMktManager(s: any) {
  const u = s?.user;
  return u?.departmentCode === 'MKT' && (u?.level === 'senior_manager' || u?.level === 'mid_manager');
}

/**
 * POST /api/media-library/init-folder
 * Tự động tạo folder gốc "Tài liệu chung" (nếu chưa có) 
 * và folder cá nhân cho nhân viên MKT mới.
 * Gọi từ luồng tạo nhân viên (HR module).
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = isAdmin(session);
  const mktManager = isMktManager(session);

  const { userId, userName, departmentCode, action } = await req.json();

  // Đảm bảo "Tài liệu chung" luôn tồn tại
  const commonFolder = await db.mediaFolder.findFirst({ where: { isPublic: true, parentId: null } });
  if (!commonFolder) {
    await db.mediaFolder.create({
      data: { name: 'Tài liệu chung', isPublic: true, ownerIsActive: true },
    });
  }

  if (action === 'create' && userId && userName) {
    // Tạo folder cá nhân cho bất kỳ tài khoản nào
    const existing = await db.mediaFolder.findFirst({ where: { ownerId: userId, parentId: null } });
    if (!existing) {
      const folder = await db.mediaFolder.create({
        data: {
          name: userName,
          ownerId: userId,
          ownerName: userName,
          isPublic: false,
          ownerIsActive: true,
        },
      });
      return NextResponse.json({ data: folder, message: `Đã tạo thư mục cho ${userName}` });
    }
    return NextResponse.json({ message: 'Thư mục đã tồn tại' });
  }

  if (action === 'deactivate' && userId) {
    // Khi nhân viên nghỉ việc → đánh dấu folder
    await db.mediaFolder.updateMany({
      where: { ownerId: userId, parentId: null },
      data: { ownerIsActive: false },
    });
    return NextResponse.json({ message: 'Đã cập nhật trạng thái thư mục' });
  }

  return NextResponse.json({ message: 'OK' });
}
