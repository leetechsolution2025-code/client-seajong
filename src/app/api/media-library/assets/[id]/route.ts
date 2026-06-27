import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import path from 'path';

const db = prisma as any;

function isAdmin(s: any) { return s?.user?.role === 'SUPERADMIN' || s?.user?.role === 'ADMIN'; }

// POST /api/media-library/assets/[id]/download → tăng counter
export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const asset = await db.mediaAsset.update({
    where: { id: params.id },
    data: { downloads: { increment: 1 } },
  });

  return NextResponse.json({ fileUrl: asset.fileUrl });
}

function isManager(s: any) {
  const u = s?.user;
  const managerLevels = ['manager', 'mid_manager', 'senior_manager'];
  const isMgrLevel = managerLevels.includes(u?.level);
  const isMgrPosition = u?.positionName?.toLowerCase().includes('trưởng phòng');
  const isAdminRole = u?.role === 'SUPERADMIN' || u?.role === 'ADMIN';
  return isMgrLevel || isMgrPosition || isAdminRole;
}

// DELETE /api/media-library/assets/[id]
export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const asset = await db.mediaAsset.findUnique({
    where: { id: params.id },
    include: { folder: true },
  });
  if (!asset) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

  const userId = session.user?.id;
  const admin = isAdmin(session);
  
  let canDelete = admin || asset.folder.ownerId === userId;

  if (!canDelete && asset.folder.isPublic) {
    const mgr = isManager(session);
    if (mgr) {
      const uploader = await prisma.user.findUnique({
        where: { id: asset.uploadedBy },
        select: {
          employee: {
            select: {
              departmentCode: true,
            }
          }
        }
      });
      const uploaderDept = uploader?.employee?.departmentCode;
      const currentUserDept = (session.user as any)?.departmentCode;
      if (uploaderDept && currentUserDept && uploaderDept.toLowerCase() === currentUserDept.toLowerCase()) {
        canDelete = true;
      }
    }
  }

  if (!canDelete) return NextResponse.json({ error: 'Không có quyền xóa' }, { status: 403 });

  // Xóa file vật lý
  try {
    const filePath = path.join(process.cwd(), 'public', asset.fileUrl);
    await unlink(filePath);
  } catch { /* file đã bị xóa trước đó */ }

  await db.mediaAsset.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

// PATCH /api/media-library/assets/[id]
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { isPublic } = body;
    if (isPublic === undefined) return NextResponse.json({ error: 'Thiếu trường isPublic' }, { status: 400 });

    const asset = await db.mediaAsset.findUnique({
      where: { id: params.id },
      include: { folder: true }
    });
    if (!asset) return NextResponse.json({ error: 'Không tìm thấy tài liệu' }, { status: 404 });

    const userId = session.user?.id;
    const admin = isAdmin(session);
    const canUpdate = admin || asset.uploadedBy === userId || asset.folder.ownerId === userId;

    if (!canUpdate) return NextResponse.json({ error: 'Không có quyền thay đổi thuộc tính của tài liệu này' }, { status: 403 });

    const updatedAsset = await db.mediaAsset.update({
      where: { id: params.id },
      data: { isPublic }
    });

    return NextResponse.json({ data: updatedAsset });
  } catch (error: any) {
    console.error('[PATCH /api/media-library/assets/[id]] ERROR:', error?.message);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
