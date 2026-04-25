import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const db = prisma as any;

function isAdmin(s: any) { return s?.user?.role === 'SUPERADMIN' || s?.user?.role === 'ADMIN'; }
function isMktManager(s: any) {
  const u = s?.user;
  return ['marketing', 'MKT', 'mkt'].includes(u?.departmentCode) &&
    ['manager', 'mid_manager', 'senior_manager'].includes(u?.level);
}

// GET /api/media-library/assets?folderId=xxx
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get('folderId');
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type') || '';
  const channel = searchParams.get('channel') || '';

  if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 });

  // Kiểm tra quyền truy cập folder
  const folder = await db.mediaFolder.findUnique({ where: { id: folderId } });
  if (!folder) return NextResponse.json({ error: 'Folder không tồn tại' }, { status: 404 });

  const userId = session.user?.id;
  const admin = isAdmin(session);
  const canAccess =
    admin ||
    folder.isPublic ||
    folder.ownerId === userId ||
    (isMktManager(session) && !folder.ownerIsActive);

  if (!canAccess) return NextResponse.json({ error: 'Không có quyền truy cập thư mục này' }, { status: 403 });

  const where: any = { folderId };
  if (search) where.name = { contains: search };
  if (type) where.type = type;
  if (channel) where.channel = channel;

  const assets = await db.mediaAsset.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: assets });
}

// POST /api/media-library/assets → upload file
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string;
    const name = (formData.get('name') as string) || file?.name;
    const description = (formData.get('description') as string) || '';
    const type = (formData.get('type') as string) || 'other';
    const channel = (formData.get('channel') as string) || 'all';

    if (!file || !folderId) return NextResponse.json({ error: 'Thiếu file hoặc folderId' }, { status: 400 });

    const folder = await db.mediaFolder.findUnique({ where: { id: folderId } });
    if (!folder) return NextResponse.json({ error: 'Folder không tồn tại' }, { status: 404 });

    const userId = (session.user as any)?.id;
    const admin = isAdmin(session);
    const canUpload =
      admin ||
      (folder.isPublic && isMktManager(session)) ||
      folder.ownerId === userId;

    if (!canUpload) {
      console.error('[Upload] Permission denied:', { userId, isPublic: folder.isPublic, isMktManager: isMktManager(session), ownerId: folder.ownerId, dept: (session.user as any)?.departmentCode, level: (session.user as any)?.level });
      return NextResponse.json({ error: 'Không có quyền upload vào thư mục này' }, { status: 403 });
    }

    // Lưu file vào /public/uploads/marketing/
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._\-]/g, '_')}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'marketing');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, safeName), buffer);

    const fileUrl = `/uploads/marketing/${safeName}`;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    const asset = await db.mediaAsset.create({
      data: {
        folderId,
        name: name?.trim() || file.name,
        description,
        type,
        channel,
        fileUrl,
        fileSize: file.size,
        fileType: ext,
        uploadedBy: userId,
      },
    });

    return NextResponse.json({ data: asset });
  } catch (error: any) {
    console.error('[POST /api/media-library/assets] ERROR:', error?.message, error?.stack?.split('\n')[0]);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
