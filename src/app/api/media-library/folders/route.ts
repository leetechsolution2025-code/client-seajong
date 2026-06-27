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

function isManager(session: any) {
  const u = session?.user;
  const managerLevels = ['manager', 'mid_manager', 'senior_manager'];
  const isMgrLevel = managerLevels.includes(u?.level);
  const isMgrPosition = u?.positionName?.toLowerCase().includes('trưởng phòng');
  const isAdminRole = u?.role === 'SUPERADMIN' || u?.role === 'ADMIN';
  return isMgrLevel || isMgrPosition || isAdminRole;
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

    // Tự động đồng bộ/khởi tạo folder gốc cho tất cả nhân sự đang hoạt động (có hồ sơ nhân viên và chưa nghỉ việc)
    const activeUsers = await prisma.user.findMany({
      where: {
        employee: {
          status: { not: 'resigned' }
        }
      },
      include: {
        employee: {
          select: {
            fullName: true,
            status: true
          }
        }
      }
    });

    const activeUserIds = new Set(activeUsers.map(u => u.id));

    // Lấy tất cả folder cá nhân gốc hiện có (kèm theo đếm số lượng assets và children để kiểm tra trống)
    const existingRootFolders = await db.mediaFolder.findMany({
      where: { parentId: null, isPublic: false, ownerId: { not: null } },
      select: {
        id: true, name: true, ownerId: true, ownerName: true,
        parentId: true, isPublic: true, ownerIsActive: true, createdAt: true,
        _count: { select: { assets: true, children: true } }
      }
    });

    // Bản đồ lưu trữ folder duy nhất theo ownerId và phát hiện trùng lặp
    const folderByOwnerId = new Map<string, any>();
    const duplicateFolderIds: string[] = [];

    for (const folder of existingRootFolders) {
      if (!folder.ownerId) continue;
      if (folderByOwnerId.has(folder.ownerId)) {
        duplicateFolderIds.push(folder.id);
      } else {
        folderByOwnerId.set(folder.ownerId, folder);
      }
    }

    // Dọn dẹp/gộp các folder trùng lặp nếu có
    for (const dupId of duplicateFolderIds) {
      const dupFolder = existingRootFolders.find((f: any) => f.id === dupId);
      if (!dupFolder || !dupFolder.ownerId) continue;
      const keptFolder = folderByOwnerId.get(dupFolder.ownerId);
      if (keptFolder) {
        // Chuyển assets từ folder trùng sang folder giữ lại
        await db.mediaAsset.updateMany({
          where: { folderId: dupId },
          data: { folderId: keptFolder.id }
        });
        // Chuyển subfolders sang folder giữ lại
        await db.mediaFolder.updateMany({
          where: { parentId: dupId },
          data: { parentId: keptFolder.id }
        });
        // Xóa folder trùng lặp
        await db.mediaFolder.delete({
          where: { id: dupId }
        });
      }
    }

    // Xóa các folder trống của tài khoản không còn hoạt động/không có hồ sơ nhân sự, hoặc đánh dấu là ownerIsActive = false
    const foldersToDeactivate = [];
    const foldersToDelete = [];
    for (const folder of existingRootFolders) {
      if (folder.ownerId && !activeUserIds.has(folder.ownerId)) {
        const assetCount = folder._count?.assets ?? 0;
        const childCount = folder._count?.children ?? 0;
        if (assetCount === 0 && childCount === 0) {
          foldersToDelete.push(folder.id);
        } else if (folder.ownerIsActive) {
          foldersToDeactivate.push(folder.id);
        }
      }
    }
    if (foldersToDelete.length > 0) {
      await db.mediaFolder.deleteMany({
        where: { id: { in: foldersToDelete } }
      });
    }
    if (foldersToDeactivate.length > 0) {
      await db.mediaFolder.updateMany({
        where: { id: { in: foldersToDeactivate } },
        data: { ownerIsActive: false }
      });
    }

    // Tự động tạo folder cho các nhân sự chưa có
    const foldersToCreate = [];
    for (const user of activeUsers) {
      if (!folderByOwnerId.has(user.id)) {
        const name = user.employee?.fullName || user.name || user.email.split('@')[0];
        foldersToCreate.push({
          name,
          ownerId: user.id,
          ownerName: name,
          parentId: null,
          isPublic: false,
          ownerIsActive: true
        });
      }
    }

    if (foldersToCreate.length > 0) {
      await db.mediaFolder.createMany({
        data: foldersToCreate
      });
    }

    // Lấy lại danh sách tất cả các thư mục sau khi đồng bộ
    const allFolders = await db.mediaFolder.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, name: true, ownerId: true, ownerName: true,
        parentId: true, isPublic: true, ownerIsActive: true, createdAt: true,
      },
    });

    // Tính toán số lượng tài liệu thực tế hiển thị cho người dùng hiện tại (bao gồm đệ quy thư mục con)
    const allAssets = await db.mediaAsset.findMany({
      select: {
        id: true,
        folderId: true,
        isPublic: true,
        uploadedBy: true,
        folder: {
          select: {
            ownerId: true
          }
        }
      }
    });

    const isAssetVisible = (asset: any) => {
      if (admin) return true;
      return asset.isPublic || asset.uploadedBy === userId || asset.folder?.ownerId === userId;
    };

    const directVisibleCounts = new Map<string, number>();
    for (const asset of allAssets) {
      if (isAssetVisible(asset)) {
        const fid = asset.folderId;
        directVisibleCounts.set(fid, (directVisibleCounts.get(fid) || 0) + 1);
      }
    }

    const childrenMap = new Map<string, string[]>();
    for (const f of allFolders) {
      if (f.parentId) {
        const list = childrenMap.get(f.parentId) || [];
        list.push(f.id);
        childrenMap.set(f.parentId, list);
      }
    }

    const memo = new Map<string, number>();
    const getRecursiveCount = (folderId: string): number => {
      if (memo.has(folderId)) return memo.get(folderId)!;
      let count = directVisibleCounts.get(folderId) || 0;
      const children = childrenMap.get(folderId) || [];
      for (const childId of children) {
        count += getRecursiveCount(childId);
      }
      memo.set(folderId, count);
      return count;
    };

    // Lọc theo quyền (Tất cả thư mục hoạt động đều công khai, chỉ giới hạn thư mục của nhân sự đã nghỉ việc)
    const visible = allFolders.filter((f: any) => {
      if (admin) return true;
      if (!f.ownerIsActive) return (mktManager || admin);
      return true;
    });

    // Lấy departmentCode của các chủ sở hữu folder
    const ownerIds = Array.from(new Set(visible.map((f: any) => f.ownerId).filter(Boolean))) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: {
        id: true,
        employee: {
          select: {
            departmentCode: true,
            departmentName: true,
            position: true
          }
        }
      }
    });

    const posCategories = await prisma.category.findMany({
      where: { type: 'position' },
      select: { code: true, name: true }
    });
    const posMap = new Map(posCategories.map((c: any) => [c.code, c.name]));

    const ownerDeptMap = new Map(users.map((u: any) => [u.id, u.employee?.departmentCode]));
    const ownerDeptNameMap = new Map(users.map((u: any) => [u.id, u.employee?.departmentName]));
    const ownerPositionMap = new Map(users.map((u: any) => [u.id, posMap.get(u.employee?.position) || u.employee?.position]));

    const enrichedFolders = visible.map((f: any) => ({
      ...f,
      _count: {
        assets: getRecursiveCount(f.id),
        children: childrenMap.get(f.id)?.length || 0
      },
      ownerDeptCode: ownerDeptMap.get(f.ownerId) || null,
      ownerDeptName: ownerDeptNameMap.get(f.ownerId) || null,
      ownerPositionName: ownerPositionMap.get(f.ownerId) || null,
    }));

    return NextResponse.json({ data: enrichedFolders });
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

    const { name, parentId, isPublic } = await req.json();
    if (!name?.trim() || !parentId) {
      return NextResponse.json({ error: 'Thiếu tên hoặc parentId' }, { status: 400 });
    }

    const parent = await db.mediaFolder.findUnique({ where: { id: parentId } });
    if (!parent) return NextResponse.json({ error: 'Thư mục cha không tồn tại' }, { status: 404 });

    const userId = (session.user as any)?.id;
    const admin = isAdmin(session);
    const mgr = isManager(session);

    let canCreate = admin || parent.ownerId === userId;
    if (!canCreate && parent.isPublic) {
      canCreate = mgr; // Trưởng phòng được tạo thư mục trong tài liệu chung
    }

    if (!canCreate) {
      return NextResponse.json({ error: 'Không có quyền tạo thư mục con ở đây' }, { status: 403 });
    }

    const folder = await db.mediaFolder.create({
      data: {
        name: name.trim(),
        ownerId: parent.isPublic ? userId : (parent.ownerId || userId),
        ownerName: parent.isPublic ? (session.user as any)?.name : (parent.ownerName || (session.user as any)?.name),
        parentId,
        isPublic: parent.isPublic || !!isPublic,
        ownerIsActive: true,
      },
    });

    return NextResponse.json({ data: folder });
  } catch (error: any) {
    console.error('[POST /api/media-library/folders]', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
