import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const db = prisma as any;

function isAdmin(session: any) {
  return session?.user?.role === 'SUPERADMIN' || session?.user?.role === 'ADMIN';
}

// DELETE /api/media-library/folders/[id] → xóa thư mục (và các con)
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
    }
    const userId = (session.user as any)?.id;
    const admin = isAdmin(session);

    const folder = await db.mediaFolder.findUnique({ where: { id } });
    if (!folder) return NextResponse.json({ error: 'Không tìm thấy thư mục' }, { status: 404 });

    // Không cho xóa thư mục chung (isPublic root)
    if (folder.isPublic && folder.parentId === null) {
      return NextResponse.json({ error: 'Không thể xóa thư mục chung' }, { status: 403 });
    }

    // Kiểm tra quyền
    if (!admin && folder.ownerId !== userId) {
      return NextResponse.json({ error: 'Không có quyền xóa thư mục này' }, { status: 403 });
    }

    // Xóa đệ quy: xóa tất cả assets và folders con
    await deleteFolderRecursive(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/media-library/folders/[id]]', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

async function deleteFolderRecursive(folderId: string) {
  // Lấy tất cả thư mục con
  const children = await db.mediaFolder.findMany({ where: { parentId: folderId }, select: { id: true } });
  for (const child of children) {
    await deleteFolderRecursive(child.id);
  }
  // Xóa assets thuộc folder này
  await db.mediaAsset.deleteMany({ where: { folderId } });
  // Xóa folder
  await db.mediaFolder.delete({ where: { id: folderId } });
}
