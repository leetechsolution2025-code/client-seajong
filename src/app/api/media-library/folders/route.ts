import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const db = prisma as any;

function isAdmin(session: any) {
  return session?.user?.role === 'SUPERADMIN' || session?.user?.role === 'ADMIN';
}
function isMktManager(session: any) {
  const u = session?.user;
  const mktDepts = ['marketing', 'MKT', 'mkt'];
  const managerLevels = ['manager', 'mid_manager', 'senior_manager'];
  return mktDepts.includes(u?.departmentCode) && managerLevels.includes(u?.level);
}
function isMkt(session: any) {
  return ['marketing', 'MKT', 'mkt'].includes(session?.user?.departmentCode);
}

// GET /api/media-library/folders
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any)?.id;
    const admin = isAdmin(session);
    const mktManager = isMktManager(session);
    const mkt = isMkt(session);

    // Đảm bảo "Tài liệu chung" luôn tồn tại
    const commonExists = await db.mediaFolder.findFirst({ where: { isPublic: true, parentId: null } });
    if (!commonExists) {
      await db.mediaFolder.create({
        data: { name: 'Tài liệu chung', isPublic: true, ownerIsActive: true },
      });
    }

    const allFolders = await db.mediaFolder.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, name: true, ownerId: true, ownerName: true,
        parentId: true, isPublic: true, ownerIsActive: true, createdAt: true,
        _count: { select: { assets: true, children: true } },
      },
    });

    // Lọc theo quyền
    const visible = allFolders.filter((f: any) => {
      if (admin) return true;
      if (f.isPublic) return true;                                  // Tài liệu chung: ai cũng thấy
      if (f.ownerId === userId) return true;                        // Folder của mình
      if (!f.ownerIsActive) return (mktManager || admin);          // Folder nghỉ việc: chỉ TP + Admin
      if (mkt) return true;                                         // MKT thấy folder đồng nghiệp (locked)
      return false;                                                  // User thường: chỉ thấy folder mình + Tài liệu chung
    });

    return NextResponse.json({ data: visible });
  } catch (error: any) {
    console.error('[GET /api/media-library/folders] ERROR:', error?.message);
    console.error('[GET /api/media-library/folders] STACK:', error?.stack);
    return NextResponse.json({ error: error.message || 'Internal error', detail: error?.stack?.split('\n')[0] }, { status: 500 });
  }
}

// POST /api/media-library/folders → tạo subfolder trong folder của mình
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, parentId } = await req.json();
    if (!name?.trim() || !parentId) {
      return NextResponse.json({ error: 'Thiếu tên hoặc parentId' }, { status: 400 });
    }

    const parent = await db.mediaFolder.findUnique({ where: { id: parentId } });
    if (!parent) return NextResponse.json({ error: 'Thư mục cha không tồn tại' }, { status: 404 });

    const userId = (session.user as any)?.id;
    const admin = isAdmin(session);
    if (!admin && parent.ownerId !== userId) {
      return NextResponse.json({ error: 'Không có quyền tạo thư mục con ở đây' }, { status: 403 });
    }

    const folder = await db.mediaFolder.create({
      data: {
        name: name.trim(),
        ownerId: parent.ownerId,
        ownerName: parent.ownerName,
        parentId,
        isPublic: false,
        ownerIsActive: true,
      },
    });

    return NextResponse.json({ data: folder });
  } catch (error: any) {
    console.error('[POST /api/media-library/folders]', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
