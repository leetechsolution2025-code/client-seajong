import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import path from 'path';

const db = prisma as any;

function isAdmin(s: any) { return s?.user?.role === 'SUPERADMIN' || s?.user?.role === 'ADMIN'; }

// POST /api/media-library/assets/[id]/download → tăng counter
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const asset = await db.mediaAsset.update({
    where: { id: params.id },
    data: { downloads: { increment: 1 } },
  });

  return NextResponse.json({ fileUrl: asset.fileUrl });
}

// DELETE /api/media-library/assets/[id]
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const asset = await db.mediaAsset.findUnique({
    where: { id: params.id },
    include: { folder: true },
  });
  if (!asset) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

  const userId = session.user?.id;
  const admin = isAdmin(session);
  const canDelete = admin || asset.folder.ownerId === userId;

  if (!canDelete) return NextResponse.json({ error: 'Không có quyền xóa' }, { status: 403 });

  // Xóa file vật lý
  try {
    const filePath = path.join(process.cwd(), 'public', asset.fileUrl);
    await unlink(filePath);
  } catch { /* file đã bị xóa trước đó */ }

  await db.mediaAsset.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
