import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getNextQcCode } from '@/lib/genDocCode';

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
      // 1. Update status if it changed and save note to repairPlan
      await tx.defectRecord.update({
        where: { id },
        data: {
          ...(nextStatus && nextStatus !== oldStatus ? { status: nextStatus } : {}),
          ...(nextStatus === 'COMPLETED' ? { completionDate: new Date() } : {}),
          ...(note ? { repairPlan: note } : {})
        }
      });

      // 2. Create activity log
      await tx.defectActivity.create({
        data: {
          defectId: id,
          action: (nextStatus === 'WAITING_QC' && (action === 'HOÀN THÀNH' || action === 'YÊU CẦU QC KIỂM TRA'))
            ? 'HOÀN THÀNH (CHUYỂN QC KIỂM TRA)'
            : (action || 'CẬP NHẬT'),
          description: note || 'Kỹ thuật viên hoàn tất xử lý và chuyển thông tin sang bộ phận QC kiểm định chất lượng (OQC).',
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
        const qty = Number(body.returnQty) > 0 
          ? Number(body.returnQty) 
          : (Number(defect.quantity) > 0 ? Number(defect.quantity) : 1);

        const actualResultItems = [{
          tenHang: defect.productName || "Thành phẩm",
          code: defect.productCode,
          soLuong: qty,
          qty: qty,
          donVi: "Bộ",
          type: "Kho Hàng Lỗi (KHO-LOI)",
          warehouseCode: "KHO-LOI",
          loaiNhapKho: "Nhập kho hàng trả lại",
          isReturn: true,
          defectCode: defect.code,
          isShortage: false
        }];

        await tx.task.create({
          data: {
            title: `Yêu cầu nhập kho hàng trả lại (${defect.code})`,
            description: `Yêu cầu nhập kho hàng trả lại (Xử lý hàng lỗi Mức 5: Nhập lại kho).\n` +
              `Hồ sơ: ${defect.code}\n` +
              `Sản phẩm: ${defect.productName}\n` +
              `Số lượng: ${qty}\n` +
              `Ghi chú: ${note}`,
            status: 'pending',
            priority: 'high',
            creatorId: 'system',
            assigneeId: defaultAssignee,
            deptCode: 'logistics',
            actualResult: JSON.stringify(actualResultItems)
          }
        });
        
        await sendWarehouseNotification(tx, `Yêu cầu nhập kho hàng trả lại (${defect.code})`, `Kỹ thuật đã yêu cầu nhập kho hàng trả lại cho ${qty} sản phẩm từ hồ sơ **${defect.code}** (Mức 5: Nhập lại kho).\n\nVui lòng tiếp nhận và lập phiếu nhập kho hàng trả lại vào Kho hàng lỗi (KHO-LOI).`);
      } else if (action === 'YÊU CẦU QC KIỂM TRA' || nextStatus === 'WAITING_QC' || action === 'HOÀN THÀNH') {
        // Tạo phiếu kiểm tra chất lượng đầu ra (OQC)
        const qcCode = await getNextQcCode(new Date(), tx);

        await tx.qualityInspection.create({
          data: {
            code: qcCode,
            type: "OQC",
            status: "Chưa thực hiện",
            productName: defect.productName,
            requesterName: performedBy || 'Bộ phận sản xuất',
            requesterDept: 'Kỹ thuật / Sản xuất',
            executionTime: new Date(),
            notes: `Kiểm tra OQC đầu ra: Bộ phận sản xuất đã hoàn thành công việc này lại rồi cho hồ sơ ${defect.code}. Nội dung xử lý: ${note || defect.repairPlan || ''}`,
            metadata: JSON.stringify({
              defectId: id,
              defectCode: defect.code,
              productCode: defect.productCode,
              productName: defect.productName,
              model: defect.productCode,
              quantity: defect.quantity || 1,
              totalQuantity: defect.quantity || 1,
              sampleQuantity: defect.quantity || 1,
              productionOrder: defect.orderNumber || defect.code,
              customerName: defect.customerName,
              repairNote: note || defect.repairPlan,
              source: "DEFECT_REPAIR",
              items: [{
                productName: defect.productName,
                model: defect.productCode,
                quantity: defect.quantity || 1,
                sampleQuantity: defect.quantity || 1,
                soLuong: defect.quantity || 1,
                donVi: "Bộ"
              }]
            })
          }
        });

        // Tìm nhân viên bộ phận QC/QA
        const qaStaff = await tx.employee.findMany({
          where: {
            status: "active",
            OR: [
              { departmentCode: { in: ["qa", "qc", "BPCL"] } },
              { departmentCode: { contains: "chất lượng" } },
              { departmentName: { contains: "Chất lượng" } },
              { departmentName: { contains: "chất lượng" } },
              { position: { contains: "QC" } },
              { position: { contains: "QA" } }
            ]
          },
          select: { userId: true, position: true }
        });
        const qaUserIds = [...new Set(qaStaff.map((u: any) => u.userId).filter(Boolean) as string[])];
        const qaHead = qaStaff.find((s: any) => (s.position || "").toLowerCase().includes("trưởng") || (s.position || "").toLowerCase().includes("lead"));
        const defaultQaAssignee = qaHead?.userId || qaUserIds[0] || defaultAssignee;

        // Tạo Task giao cho bộ phận QC
        await tx.task.create({
          data: {
            title: `Kiểm tra chất lượng đầu ra (OQC) - Hồ sơ ${defect.code}`,
            description: `Bộ phận sản xuất đã hoàn thành công việc này lại rồi (Hồ sơ: ${defect.code}, Sản phẩm: ${defect.productName}, SL: ${defect.quantity || 1} bộ).\n` +
              `Mã phiếu OQC: ${qcCode}\n` +
              `Nội dung xử lý: ${note || defect.repairPlan || ''}\n` +
              `Đề nghị bộ phận QC kiểm tra theo quy trình OQC và đưa ra kết luận.`,
            status: 'pending',
            priority: 'high',
            creatorId: 'system',
            assigneeId: defaultQaAssignee,
            deptCode: 'qa',
            actualResult: JSON.stringify([{ qcCode, defectCode: defect.code, productName: defect.productName, quantity: defect.quantity }])
          }
        });

        // Gửi thông báo đến bộ phận QC
        await sendQcNotification(
          tx,
          qaUserIds,
          `🔍 Yêu cầu kiểm tra chất lượng (OQC) - ${defect.code}`,
          `Bộ phận sản xuất đã hoàn thành công việc này lại rồi cho hồ sơ **${defect.code}** (${defect.productName}). Vui lòng tiến hành kiểm tra chất lượng theo phiếu OQC **${qcCode}**.`
        );
      } else if (action === 'QC KẾT LUẬN: ĐẠT') {
        // Cập nhật phiếu QualityInspection
        const qcInspection = await tx.qualityInspection.findFirst({
          where: {
            OR: [
              { metadata: { contains: defect.code } },
              { metadata: { contains: id } }
            ]
          },
          orderBy: { createdAt: 'desc' }
        });

        if (qcInspection) {
          await tx.qualityInspection.update({
            where: { id: qcInspection.id },
            data: {
              status: "Đã hoàn thành",
              result: "Đạt",
              inspectorName: performedBy || "Bộ phận QC",
              notes: note || "Kiểm tra chất lượng đầu ra đạt tiêu chuẩn xuất xưởng sau sửa chữa."
            }
          });

          // Hoàn thành các công việc Task của QC
          const qcTasks = await tx.task.findMany({
            where: {
              deptCode: "qa",
              status: { in: ["pending", "in_progress", "todo"] },
              description: { contains: defect.code }
            }
          });
          for (const t of qcTasks) {
            await tx.task.update({
              where: { id: t.id },
              data: {
                status: "completed",
                actualResult: JSON.stringify([{ msg: `QC đánh giá Đạt. Hồ sơ: ${defect.code}`, date: new Date().toISOString() }])
              }
            });
          }
        }

        // TỰ ĐỘNG PHÁT SINH LỆNH NHẬP KHO THÀNH PHẨM (KHO-CHINH)
        const passedQty = Number(defect.quantity) || 1;
        const warehouseItems = [{
          tenHang: defect.productName || "Thành phẩm",
          code: defect.productCode,
          soLuong: passedQty,
          qty: passedQty,
          donVi: "Bộ",
          type: "Kho Hàng Hoá (KHO-CHINH)",
          warehouseCode: "KHO-CHINH",
          isShortage: false
        }];

        await tx.task.create({
          data: {
            title: `Yêu cầu nhập kho thành phẩm đạt sau sửa chữa (${defect.code})`,
            description: `Kiểm tra OQC đạt yêu cầu cho hồ sơ hàng lỗi ${defect.code} (${defect.productName}, SL: ${passedQty} bộ).\n` +
              `Đề nghị bộ phận Kho vận tiếp nhận và nhập kho thành phẩm (KHO-CHINH).\n` +
              `Ghi chú: ${note || 'Đạt tiêu chuẩn xuất xưởng sau sửa chữa'}`,
            status: 'pending',
            priority: 'high',
            creatorId: 'system',
            assigneeId: defaultAssignee,
            deptCode: 'logistics',
            actualResult: JSON.stringify(warehouseItems)
          }
        });

        await sendWarehouseNotification(
          tx,
          `Yêu cầu nhập kho thành phẩm đạt sau sửa chữa (${defect.code})`,
          `QC đã kết luận kiểm tra OQC ĐẠT cho hồ sơ hàng lỗi **${defect.code}** (${defect.productName}, SL: ${passedQty} bộ).\n\nVui lòng tiếp nhận và nhập lại kho thành phẩm (KHO-CHINH).`
        );
      } else if (action === 'QC KẾT LUẬN: KHÔNG ĐẠT') {
        const qcInspection = await tx.qualityInspection.findFirst({
          where: {
            OR: [
              { metadata: { contains: defect.code } },
              { metadata: { contains: id } }
            ]
          },
          orderBy: { createdAt: 'desc' }
        });

        if (qcInspection) {
          await tx.qualityInspection.update({
            where: { id: qcInspection.id },
            data: {
              status: "Đã hoàn thành",
              result: "Không đạt",
              inspectorName: performedBy || "Bộ phận QC",
              notes: note || "Kiểm tra chất lượng đầu ra không đạt. Cần xử lý lại."
            }
          });
        }
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

async function sendQcNotification(tx: any, userIds: string[], title: string, content: string) {
  if (userIds.length === 0) return;
  const adminUser = await tx.user.findFirst({ select: { id: true } });
  const creatorId = adminUser?.id;
  if (!creatorId) return;

  const notif = await tx.notification.create({
    data: {
      title,
      content,
      type: "info",
      priority: "high",
      audienceType: "group",
      audienceValue: JSON.stringify(userIds),
      createdById: creatorId,
    }
  });

  await Promise.all(
    userIds.map(uid =>
      tx.notificationRecipient.create({
        data: { notificationId: notif.id, userId: uid }
      })
    )
  );
}

