import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const params = await props.params;
    const { id } = params;
    const body = await req.json();
    const { result, notes, passedQuantity, failedQuantity, items, checks } = body;

    const inspection = await prisma.qualityInspection.findUnique({
      where: { code: id } // Note: The frontend passes 'code' as 'id' in selectedInspection
    });

    if (!inspection) {
      return NextResponse.json({ error: "Không tìm thấy phiếu kiểm tra" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 0. Chuẩn bị metadata mới
      const oldMeta = typeof inspection.metadata === 'string' 
        ? JSON.parse(inspection.metadata) 
        : (inspection.metadata || {});
      const newMeta = { ...oldMeta };
      newMeta.passedQuantity = passedQuantity;
      newMeta.failedQuantity = failedQuantity;
      if (items && Array.isArray(items)) {
        newMeta.items = items;
      }
      if (checks && Array.isArray(checks)) {
        newMeta.checks = checks;
      }

      // 1. Cập nhật trạng thái phiếu QC
      await tx.qualityInspection.update({
        where: { id: inspection.id },
        data: {
          result,
          notes: notes || inspection.notes,
          status: "Đã hoàn thành",
          inspectorName: session.user?.name || session.user?.email || "QA/QC",
          metadata: JSON.stringify(newMeta)
        }
      });

      // 1.5. Cập nhật trạng thái Công việc (Task) tương ứng
      const qcTasks = await tx.task.findMany({
        where: {
          deptCode: "qa",
          status: { in: ["pending", "in_progress", "todo"] },
          description: { contains: inspection.code }
        }
      });
      
      for (const task of qcTasks) {
        await tx.task.update({
          where: { id: task.id },
          data: {
            status: "completed",
            actualResult: JSON.stringify([{ msg: `Đã đánh giá chất lượng: ${result}. Phiếu: ${inspection.code}`, date: new Date().toISOString() }])
          }
        });
      }

      // 2. Định nghĩa hàm helper gửi thông báo đa bộ phận trong Transaction
      const sendNotification = async (
        title: string,
        content: string,
        userIds: string[],
        audienceType: string,
        audienceValue: string,
        type = "success"
      ) => {
        if (userIds.length === 0) return;
        const notif = await tx.notification.create({
          data: {
            title,
            content,
            type,
            priority: "high",
            audienceType,
            audienceValue,
            createdById: session.user.id
          }
        });
        await Promise.all(
          userIds.map(uid =>
            tx.notificationRecipient.upsert({
              where: { notificationId_userId: { notificationId: notif.id, userId: uid } },
              update: {},
              create: { notificationId: notif.id, userId: uid }
            })
          )
        );
      };

      // 3. Lấy thông tin nhân viên các bộ phận liên quan
      const storekeepers = await tx.employee.findMany({
        where: {
          status: "active",
          OR: [
            { departmentCode: { in: ["logistics", "BPKV"] } },
            { departmentName: { contains: "Kho" } },
            { departmentName: { contains: "kho" } },
            { position: { contains: "thủ kho" } }
          ]
        },
        select: { userId: true, position: true }
      });
      const storekeeperUserIds = storekeepers.map(u => u.userId).filter(Boolean) as string[];
      const thuKhoUserIds = storekeepers.filter(s => (s.position || "").toLowerCase().includes("thủ kho")).map(s => s.userId).filter(Boolean) as string[];
      const assigneeId = thuKhoUserIds[0] || storekeeperUserIds[0] || session.user.id;

      const productionStaff = await tx.employee.findMany({
        where: {
          status: "active",
          OR: [
            { departmentCode: { in: ["production", "BPSX"] } },
            { departmentCode: { contains: "sản xuất" } },
            { departmentName: { contains: "Sản xuất" } },
            { departmentName: { contains: "sản xuất" } }
          ]
        },
        select: { userId: true }
      });
      const productionUserIds = productionStaff.map(u => u.userId).filter(Boolean) as string[];

      const purchasingStaff = await tx.employee.findMany({
        where: {
          status: "active",
          OR: [
            { departmentCode: { in: ["purchase", "purchasing", "BPMH"] } },
            { departmentCode: { contains: "mua hàng" } },
            { departmentName: { contains: "Mua hàng" } },
            { departmentName: { contains: "mua hàng" } }
          ]
        },
        select: { userId: true }
      });
      const purchasingUserIds = purchasingStaff.map(u => u.userId).filter(Boolean) as string[];

      const accountingStaff = await tx.employee.findMany({
        where: {
          status: "active",
          OR: [
            { departmentCode: { in: ["finance", "accounting", "BPKT"] } },
            { departmentCode: { contains: "kế toán" } },
            { departmentName: { contains: "Kế toán" } },
            { departmentName: { contains: "kế toán" } }
          ]
        },
        select: { userId: true }
      });
      const accountingUserIds = accountingStaff.map(u => u.userId).filter(Boolean) as string[];

      // 4. Tạo các lệnh nhập kho (Task) cho Kho vận
      if (inspection.type === "OQC") {
        const finalPassedQty = passedQuantity !== undefined ? parseInt(passedQuantity.toString(), 10) : 0;
        const finalFailedQty = failedQuantity !== undefined ? parseInt(failedQuantity.toString(), 10) : 0;
        const itemName = oldMeta.model ? oldMeta.model.split(',')[0].trim() : inspection.productName;

        // A. Nhập kho thành phẩm đạt
        if (finalPassedQty > 0) {
          await tx.task.create({
            data: {
              title: `Yêu cầu nhập kho thành phẩm đạt (${inspection.code})`,
              description: `Kiểm tra OQC đạt yêu cầu. Đề nghị bộ phận Kho vận tiến hành nhập kho thành phẩm.\nSản phẩm: ${itemName}`,
              assigneeId,
              creatorId: session.user.id,
              deptCode: "logistics",
              priority: "high",
              status: "pending",
              actualResult: JSON.stringify([
                { tenHang: itemName, soLuong: finalPassedQty, donVi: "Bộ", type: "Kho Thành Phẩm", isShortage: false, inventoryItemId: oldMeta.inventoryItemId || null }
              ])
            }
          });
        }

        // B. Nhập kho thành phẩm lỗi (KHO-LOI)
        if (finalFailedQty > 0) {
          await tx.task.create({
            data: {
              title: `Yêu cầu nhập kho hàng lỗi (${inspection.code})`,
              description: `Kiểm tra OQC phát hiện sản phẩm lỗi. Đề nghị bộ phận Kho vận tiến hành nhập kho hàng lỗi.\nSản phẩm: ${itemName}`,
              assigneeId,
              creatorId: session.user.id,
              deptCode: "logistics",
              priority: "high",
              status: "pending",
              actualResult: JSON.stringify([
                { tenHang: `${itemName} (Hàng lỗi)`, soLuong: finalFailedQty, donVi: "Bộ", type: "Kho Hàng Lỗi", isShortage: false, inventoryItemId: oldMeta.inventoryItemId || null, warehouseCode: "KHO-LOI" }
              ])
            }
          });
        }
      } else if (inspection.type === "IQC" && Array.isArray(items)) {
        const passedItems = items.filter((it: any) => parseInt(it.passQuantity?.toString() || "0", 10) > 0);
        const failedItems = items.filter((it: any) => parseInt(it.failQuantity?.toString() || "0", 10) > 0);

        // A. Nhập kho vật tư đạt (KVP)
        if (passedItems.length > 0) {
          const taskItems = passedItems.map((it: any) => ({
            tenHang: it.name || it.productName || it.tenHang || "Vật tư không tên",
            soLuong: parseInt(it.passQuantity?.toString() || "0", 10),
            donVi: "Cái",
            type: "Kho Vật Tư / Linh kiện",
            isShortage: false,
            inventoryItemId: it.inventoryItemId || it.id || null
          }));

          await tx.task.create({
            data: {
              title: `Yêu cầu nhập kho vật tư đạt (${inspection.code})`,
              description: `Kiểm tra IQC có hàng hóa đạt yêu cầu. Đề nghị bộ phận Kho vận tiến hành nhập kho vật tư / linh kiện.\nTừ nhà cung cấp: ${oldMeta.supplierName || "N/A"}`,
              assigneeId,
              creatorId: session.user.id,
              deptCode: "logistics",
              priority: "high",
              status: "pending",
              actualResult: JSON.stringify(taskItems)
            }
          });
        }

        // B. Nhập kho vật tư lỗi (KHO-LOI)
        if (failedItems.length > 0) {
          const taskFailedItems = failedItems.map((it: any) => ({
            tenHang: `${it.name || it.productName || it.tenHang || "Vật tư không tên"} (Hàng lỗi)`,
            soLuong: parseInt(it.failQuantity?.toString() || "0", 10),
            donVi: "Cái",
            type: "Kho Hàng Lỗi",
            isShortage: false,
            inventoryItemId: it.inventoryItemId || it.id || null,
            warehouseCode: "KHO-LOI"
          }));

          await tx.task.create({
            data: {
              title: `Yêu cầu nhập kho hàng lỗi (${inspection.code})`,
              description: `Kiểm tra IQC phát hiện hàng hóa lỗi. Đề nghị bộ phận Kho vận tiến hành nhập kho hàng lỗi.\nTừ nhà cung cấp: ${oldMeta.supplierName || "N/A"}`,
              assigneeId,
              creatorId: session.user.id,
              deptCode: "logistics",
              priority: "high",
              status: "pending",
              actualResult: JSON.stringify(taskFailedItems)
            }
          });
        }
      }

      // 4.5. Tạo hồ sơ mã lỗi (DefectRecord) cho bộ phận Sản xuất
      if (inspection.type === "OQC") {
        const finalFailedQty = failedQuantity !== undefined ? parseInt(failedQuantity.toString(), 10) : 0;
        if (finalFailedQty > 0) {
          const itemName = oldMeta.model ? oldMeta.model.split(',')[0].trim() : inspection.productName;
          const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const lastDefect = await (tx as any).defectRecord.findFirst({
            where: { code: { startsWith: `ERR-${timestamp}` } },
            orderBy: { code: 'desc' }
          });
          let nextNumber = 1;
          if (lastDefect && lastDefect.code) {
            const parts = lastDefect.code.split('-');
            if (parts.length === 3) nextNumber = parseInt(parts[2], 10) + 1;
          }
          const code = `ERR-${timestamp}-${nextNumber.toString().padStart(2, '0')}`;
          
          await (tx as any).defectRecord.create({
            data: {
              code,
              source: 'INTERNAL',
              status: 'NEW',
              productName: itemName,
              productCode: oldMeta.model || 'SP-001',
              quantity: finalFailedQty,
              description: `Phát hiện lỗi trong quá trình đánh giá OQC.\nSố biên bản: ${inspection.code}`,
              reporterName: session.user?.name || "Bộ phận QA",
              reporterDepartment: "qa",
              orderNumber: inspection.code
            }
          });
        }
      } else if (inspection.type === "IQC" && Array.isArray(items)) {
        const failedItems = items.filter((it: any) => parseInt(it.failQuantity?.toString() || "0", 10) > 0);
        for (const it of failedItems) {
          const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const lastDefect = await (tx as any).defectRecord.findFirst({
            where: { code: { startsWith: `ERR-${timestamp}` } },
            orderBy: { code: 'desc' }
          });
          let nextNumber = 1;
          if (lastDefect && lastDefect.code) {
            const parts = lastDefect.code.split('-');
            if (parts.length === 3) nextNumber = parseInt(parts[2], 10) + 1;
          }
          const code = `ERR-${timestamp}-${nextNumber.toString().padStart(2, '0')}`;
          
          await (tx as any).defectRecord.create({
            data: {
              code,
              source: 'INTERNAL',
              status: 'NEW',
              productName: it.name || it.productName || it.tenHang || "Vật tư",
              productCode: it.model || it.sku || "",
              quantity: parseInt(it.failQuantity?.toString() || "0", 10),
              description: `Phát hiện lỗi trong quá trình đánh giá IQC.\nSố biên bản: ${inspection.code}\nMô tả lỗi: ${it.defectDesc || ""}`,
              reporterName: session.user?.name || "Bộ phận QA",
              reporterDepartment: "qa",
              orderNumber: inspection.code
            }
          });
        }
      }

      // 4.5. Lấy thông tin số lượng đặt hàng chuẩn từ PurchaseOrder (tránh dùng metadata vì có thể bị ghi đè)
      let poItemQtyMap = new Map();
      if (inspection.type === "IQC" && oldMeta.purchaseOrderId) {
         const po = await (tx as any).purchaseOrder.findUnique({
             where: { id: oldMeta.purchaseOrderId },
             include: { items: true }
         });
         if (po && po.items) {
             po.items.forEach((i: any) => poItemQtyMap.set(i.id, i.soLuong));
         }
      }

      // 4.6 Xử lý giao thiếu hàng (Shortage) và cập nhật số lượng đã nhận
      if (inspection.type === "IQC" && Array.isArray(items) && oldMeta.purchaseOrderId) {
        let hasShortage = false;
        let shortageDetails = "";
        
        for (const it of items) {
           if (!it.id) continue;
           const orderedQty = poItemQtyMap.get(it.id) || 0;
           const passedQty = parseInt(it.passQuantity?.toString() || "0", 10);
           const failedQty = parseInt(it.failQuantity?.toString() || "0", 10);
           const totalReceived = passedQty + failedQty;
           
           // Cập nhật số lượng đã nhận thực tế vào PO Item
           await (tx as any).purchaseOrderItem.update({
              where: { id: it.id },
              data: { soLuongDaNhan: totalReceived }
           });

           if (orderedQty > totalReceived) {
              hasShortage = true;
              const missingQty = orderedQty - totalReceived;
              shortageDetails += `- ${it.name || it.productName || it.tenHang || "Vật tư"}: Thiếu ${missingQty} ${it.unit || "Cái"} (Đặt ${orderedQty}, Giao ${totalReceived})\n`;
           }
        }

        // Nếu có hàng thiếu, đổi trạng thái PO sang disputed và thông báo khẩn
        if (hasShortage) {
           const oldPo = await (tx as any).purchaseOrder.findUnique({
             where: { id: oldMeta.purchaseOrderId },
             select: { trangThai: true, code: true }
           });
           
           if (oldPo && oldPo.trangThai !== "disputed") {
              await (tx as any).purchaseOrder.update({
                 where: { id: oldMeta.purchaseOrderId },
                 data: { trangThai: "disputed" }
              });
              
              await (tx as any).purchaseOrderActivity.create({
                data: {
                  purchaseOrderId: oldMeta.purchaseOrderId,
                  loai: "system",
                  ngay: new Date(),
                  nguoiThucHien: session.user?.name ?? "Hệ thống QA",
                  ketQua: `Phát hiện giao thiếu hàng sau đánh giá IQC. Trạng thái chuyển sang [Đang khiếu nại].\nChi tiết:\n${shortageDetails}`,
                }
              });
           }

           // Bắn thông báo riêng biệt cho phòng Mua hàng về việc thiếu hàng
           await sendNotification(
              `🚨 Cảnh báo giao thiếu hàng (${oldPo?.code || inspection.code})`,
              `Nhà cung cấp **${oldMeta.supplierName || "N/A"}** đã giao thiếu hàng so với đơn đặt.\n\nChi tiết thiếu hụt:\n${shortageDetails}\nĐề nghị phòng Mua hàng liên hệ xử lý bồi thường hoặc giao bù.`,
              purchasingUserIds,
              "department",
              "purchase",
              "warning"
           );
        }
      }

      // 5. Gửi thông báo đa bộ phận
      const displayResult = result;
      const typeText = inspection.type === "IQC" ? "Nhập khẩu vật tư" : "Thành phẩm sản xuất";
      const subjectText = inspection.type === "IQC" ? (oldMeta.supplierName || "Nhà cung cấp") : inspection.productName;

      // A. Thông báo Kho vận
      let khoNotifContent = `Kết quả kiểm định ${inspection.type} (${inspection.code}) cho ${typeText}: ${displayResult}. `;
      const totalPassedQty = inspection.type === "OQC" ? passedQuantity : items?.reduce((sum: number, it: any) => sum + (parseInt(it.passQuantity?.toString() || "0", 10)), 0);
      const totalFailedQty = inspection.type === "OQC" ? failedQuantity : items?.reduce((sum: number, it: any) => sum + (parseInt(it.failQuantity?.toString() || "0", 10)), 0);

      if (totalPassedQty > 0) {
        khoNotifContent += `Vui lòng nhập kho ${totalPassedQty} sản phẩm đạt. `;
      }
      if (totalFailedQty > 0) {
        khoNotifContent += `Vui lòng nhập kho hàng lỗi KHO-LOI cho ${totalFailedQty} sản phẩm lỗi.`;
      }
      await sendNotification(
        `📦 Yêu cầu nhập kho ${inspection.type} (${inspection.code})`,
        khoNotifContent,
        storekeeperUserIds,
        "department",
        "logistics",
        "success"
      );

      // B. Thông báo Kế toán
      const accountingNotifContent = `Báo cáo kết quả kiểm định ${inspection.type} (${inspection.code}) từ ${subjectText}. Kết quả: ${displayResult}. Số lượng đạt: ${totalPassedQty}, Số lượng lỗi: ${totalFailedQty}. Vui lòng đối chiếu công nợ và chứng từ tương ứng.`;
      await sendNotification(
        `💰 Báo cáo kiểm định QA (${inspection.code})`,
        accountingNotifContent,
        accountingUserIds,
        "department",
        "finance",
        "info"
      );

      // C. Thông báo bộ phận khởi tạo (Mua hàng cho IQC, Sản xuất cho OQC/PQC)
      const isIqc = inspection.type === "IQC";
      const notifyDeptCode = isIqc ? "purchase" : "production";
      const notifyUserIds = isIqc ? purchasingUserIds : productionUserIds;
      
      let shortageText = "";
      let hasMissing = false;
      if (isIqc && Array.isArray(items)) {
          for (const it of items) {
             const originalItem = Array.isArray(oldMeta.items) ? oldMeta.items.find((o: any) => o.id === it.id) : null;
             const orderedQty = poItemQtyMap.get(it.id) || 0;
             const passedQty = parseInt(it.passQuantity?.toString() || "0", 10);
             const failedQty = parseInt(it.failQuantity?.toString() || "0", 10);
             const receivedQty = passedQty + failedQty;
             if (orderedQty > receivedQty) {
                 hasMissing = true;
                 shortageText += `\n  - ${originalItem?.productName || originalItem?.tenHang || it.name || it.productName || it.tenHang || "Vật tư"}: Thiếu ${orderedQty - receivedQty} ${it.unit || originalItem?.unit || "Cái"}`;
             }
          }
      }

      let deptNotifContent = `Kết quả kiểm định ${inspection.type} (${inspection.code}) cho ${subjectText}: **${displayResult}**.\n`;
      deptNotifContent += `\n**Chi tiết số lượng:**\n`;
      deptNotifContent += `• Đạt yêu cầu: **${totalPassedQty}**\n`;
      deptNotifContent += `• Hàng lỗi: **${totalFailedQty}**\n`;
      
      if (hasMissing) {
          deptNotifContent += `• **Hàng giao thiếu:**${shortageText}\n`;
      }
      
      if (displayResult !== "Đạt" || totalFailedQty > 0 || hasMissing) {
         deptNotifContent += `\n⚠️ **Yêu cầu hành động:** Đề nghị phòng ${isIqc ? "Mua hàng" : "Sản xuất"} kiểm tra lại chứng từ, làm việc với nhà cung cấp để xử lý đổi trả/bồi thường phần hàng lỗi và yêu cầu giao bù phần hàng thiếu hụt.`;
      } else {
         deptNotifContent += `\n✅ Hàng hoá đạt yêu cầu, đủ số lượng. Sẵn sàng đưa vào sử dụng.`;
      }

      await sendNotification(
        `🏭 Kết quả QA: ${inspection.code}`,
        deptNotifContent,
        notifyUserIds,
        "department",
        notifyDeptCode,
        (totalFailedQty > 0 || displayResult !== "Đạt" || hasMissing) ? "warning" : "success"
      );
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("QA Inspection PATCH Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const params = await props.params;
    const { id } = params;

    const inspection = await prisma.qualityInspection.findUnique({
      where: { code: id }
    });

    if (!inspection) {
      return NextResponse.json({ error: "Không tìm thấy phiếu kiểm tra" }, { status: 404 });
    }

    await prisma.qualityInspection.delete({
      where: { id: inspection.id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("QA Inspection DELETE Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
