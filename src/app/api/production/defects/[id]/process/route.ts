import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { nextStatus, note, performedBy, action, bomUpdates } = body;

    const defect = await (prisma as any).defectRecord.findUnique({
      where: { id }
    });

    if (!defect) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const oldStatus = defect.status;

    // Use transaction to update status and create activity log
    await (prisma as any).$transaction(async (tx: any) => {
      // 1. Update status if it changed
      if (nextStatus && nextStatus !== oldStatus) {
        await tx.defectRecord.update({
          where: { id },
          data: { status: nextStatus }
        });
      }

      // 2. Create activity log
      await tx.defectActivity.create({
        data: {
          defectId: id,
          action: action || 'CẬP NHẬT',
          description: note,
          oldStatus,
          newStatus: nextStatus || oldStatus,
          performedBy: performedBy || 'Hệ thống'
        }
      });

      // 3. Create requests based on the resolution level
      // Fetch storekeeper to assign task (for warehouse tasks)
      const storekeeperUser = await tx.employee.findFirst({
        where: {
          OR: [
            { departmentName: { contains: 'Kho' } },
            { departmentCode: { contains: 'logistics' } },
            { position: { contains: 'Thủ kho' } }
          ],
          userId: { not: null }
        },
        select: { userId: true }
      });
      const defaultAssignee = storekeeperUser?.userId || 'system';

      if (action === 'QUYẾT ĐỊNH: THAY LINH KIỆN') {
        // Mức 2: Kế toán duyệt xuất vật tư thay thế
        await tx.approvalRequest.create({
          data: {
            entityType: 'DEFECT_MATERIAL_EXPORT',
            entityId: id,
            entityCode: defect.code,
            entityTitle: `Yêu cầu xuất vật tư xử lý hàng lỗi cho hồ sơ ${defect.code}`,
            department: 'KẾ TOÁN',
            metadata: JSON.stringify(bomUpdates || {}),
            requestedById: 'system',
            requestedByName: performedBy || 'Hệ thống',
            note: note
          }
        });
      } else if (action === 'QUYẾT ĐỊNH: PHÂN RÃ THU HỒI VẬT TƯ LINH KIỆN') {
        const actualResultItems = (bomUpdates || []).map((it: any) => ({
          tenHang: it.name || "Vật tư",
          soLuong: parseInt(it.quantity) || 1,
          donVi: it.unit || "cái",
          type: "Kho Vật Tư Phụ Kiện (KVP)",
          isShortage: false
        }));

        await tx.task.create({
          data: {
            title: `Yêu cầu nhập kho vật tư thu hồi (từ lỗi ${defect.code})`,
            description: `Yêu cầu nhập lại vật tư/linh kiện phân rã từ quá trình xử lý lỗi.\n` +
              `Hồ sơ: ${defect.code}\n` +
              `Ghi chú: ${note}`,
            status: 'pending',
            priority: 'high',
            creatorId: 'system',
            assigneeId: defaultAssignee,
            deptCode: 'logistics',
            actualResult: JSON.stringify(actualResultItems)
          }
        });
        
        await sendWarehouseNotification(tx, `Yêu cầu nhập kho vật tư thu hồi (từ lỗi ${defect.code})`, `Kỹ thuật đã yêu cầu nhập lại vật tư/linh kiện phân rã từ hồ sơ lỗi **${defect.code}**.\n\nVui lòng tiếp nhận vật tư và xác nhận nhập kho (KVP).`);
      } else if (action === 'QUYẾT ĐỊNH: HUỶ BỎ THAY THẾ BẰNG HÀNG HOÁ MỚI') {
        // Mức 4: Kế toán duyệt xuất thành phẩm thay thế
        await tx.approvalRequest.create({
          data: {
            entityType: 'DEFECT_PRODUCT_EXPORT',
            entityId: id,
            entityCode: defect.code,
            entityTitle: `Yêu cầu xuất hàng hoá mới thay thế cho hồ sơ ${defect.code}`,
            department: 'KẾ TOÁN',
            requestedById: 'system',
            requestedByName: performedBy || 'Hệ thống',
            note: note
          }
        });
      } else if (action === 'QUYẾT ĐỊNH: NHẬP LẠI KHO') {
        const actualResultItems = [{
          tenHang: defect.productName || "Thành phẩm",
          soLuong: 1,
          donVi: "Bộ",
          type: "Kho Hàng Lỗi (KHO-LOI)",
          isShortage: false
        }];

        await tx.task.create({
          data: {
            title: `Yêu cầu nhập kho thành phẩm lỗi (${defect.code})`,
            description: `Yêu cầu nhập lại thành phẩm lỗi về kho.\n` +
              `Hồ sơ: ${defect.code}\n` +
              `Sản phẩm: ${defect.productName}\n` +
              `Ghi chú: ${note}`,
            status: 'pending',
            priority: 'high',
            creatorId: 'system',
            assigneeId: defaultAssignee,
            deptCode: 'logistics',
            actualResult: JSON.stringify(actualResultItems)
          }
        });
        
        await sendWarehouseNotification(tx, `Yêu cầu nhập kho thành phẩm lỗi (${defect.code})`, `Kỹ thuật đã yêu cầu nhập lại thành phẩm lỗi nguyên chiếc từ hồ sơ **${defect.code}**.\n\nVui lòng tiếp nhận và xác nhận nhập kho lỗi (KHO-LOI).`);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Process defect error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function sendWarehouseNotification(tx: any, title: string, content: string) {
  const storekeepers = await tx.employee.findMany({
    where: {
      OR: [
        { departmentName: { contains: 'Kho' } },
        { departmentCode: { contains: 'logistics' } },
        { position: { contains: 'Thủ kho' } }
      ],
      userId: { not: null }
    },
    select: { userId: true }
  });
  
  const uids = [...new Set(storekeepers.map((s: any) => s.userId).filter(Boolean) as string[])];
  
  if (uids.length > 0) {
    const adminUser = await tx.user.findFirst({ select: { id: true } });
    const creatorId = adminUser?.id;
    if (!creatorId) return;

    const notif = await tx.notification.create({
      data: {
        title: `📦 ${title}`,
        content,
        type: "info",
        priority: "high",
        audienceType: "group",
        audienceValue: JSON.stringify(uids),
        createdById: creatorId,
      }
    });
    
    await Promise.all(
      uids.map(uid =>
        tx.notificationRecipient.create({
          data: { notificationId: notif.id, userId: uid }
        })
      )
    );
  }
}
