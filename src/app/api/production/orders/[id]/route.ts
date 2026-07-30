// @ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orderId = params.id;
    // Thử khôi phục tiền tố để tìm code gốc
    const codeCandidates = [
      orderId, // Nếu orderId là UUID/CUID không bị thay đổi
      orderId.replace("LSX", "DBH"),
      orderId.replace("LSX", "DHBL"),
      orderId.replace("LSX", "DH"),
    ];

    let order = null;

    // Tìm theo ID trước
    order = await prisma.saleOrder.findUnique({
      where: { id: orderId },
      include: { saleOrderItems: true },
    });

    // Nếu không thấy, tìm theo các mã code dự đoán
    if (!order) {
      for (const candidate of codeCandidates) {
        order = await prisma.saleOrder.findUnique({
          where: { code: candidate },
          include: { saleOrderItems: true },
        });
        if (order) break;
      }
    }

    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy lệnh sản xuất" },
        { status: 404 },
      );
    }

    // Tìm Task sản xuất tương ứng để biết CHÍNH XÁC mặt hàng nào cần sản xuất và số lượng bao nhiêu (chỉ sản xuất phần thiếu)
    const prodTask = await prisma.task.findFirst({
      where: {
        deptCode: "production",
        title: { contains: order.code || "" }
      }
    });

    let prodTargets = new Map<string, number>();

    if (prodTask && prodTask.actualResult) {
      try {
        const parsed = JSON.parse(prodTask.actualResult);
        for (const pt of parsed) {
          prodTargets.set(pt.tenHang, pt.missingQty);
        }
      } catch (e) {
        console.error("Failed to parse prodTask.actualResult", e);
      }
    } else if (prodTask && prodTask.description) {
      const lines = prodTask.description.split('\n');
      for (const line of lines) {
        if (line.startsWith('- ')) {
          const parts = line.substring(2).split(': ');
          if (parts.length === 2) {
            const tenHang = parts[0].trim();
            const qtyStr = parts[1].trim().split(' ')[0];
            const qty = parseFloat(qtyStr);
            if (!isNaN(qty)) {
              prodTargets.set(tenHang, qty);
            }
          }
        }
      }
    }

    const hasProdTargets = prodTargets.size > 0;

    // Bóc tách vật tư
    const items = [];
    const materialMap = new Map<string, any>();

    for (const orderItem of order.saleOrderItems) {
      // BỎ QUA nếu mặt hàng này không nằm trong danh sách cần sản xuất
      if (hasProdTargets && !prodTargets.has(orderItem.tenHang)) {
        continue;
      }

      const targetQty = hasProdTargets ? (prodTargets.get(orderItem.tenHang) || orderItem.soLuong) : orderItem.soLuong;

      let bom = null;
      let bomId = null;

      // Tìm BOM qua InventoryItem
      const invItem = await prisma.inventoryItem.findFirst({
        where: { tenHang: orderItem.tenHang },
        include: {
          dinhMucs: {
            include: {
              vatTu: {
                include: {
                  inventoryItem: true,
                  category: true,
                },
              },
            },
          },
        },
      });
      bom = invItem?.dinhMucs?.[0] || null;

      items.push({
        id: orderItem.id,
        tenHang: orderItem.tenHang,
        soLuong: targetQty,
        donGia: orderItem.donGia,
        bomFound: !!bom,
      });

      if (bom) {
        for (const vt of bom.vatTu) {
          const matId = vt.inventoryItem?.id || vt.id; // Fallback if material is null
          const totalQty = vt.soLuong * targetQty;

          if (materialMap.has(matId)) {
            const existing = materialMap.get(matId);
            existing.soLuong += totalQty;
          } else {
            materialMap.set(matId, {
              id: matId,
              tenVatTu: vt.inventoryItem?.tenHang || vt.tenVatTu,
              code: vt.inventoryItem?.code || "-",
              soLuong: totalQty,
              donViTinh: vt.inventoryItem?.donVi || vt.donViTinh || "cái",
              donGia: vt.inventoryItem?.giaNhap || 0,
              ghiChu: vt.ghiChu,
            });
          }
        }
      }
    }

    const isCompleted =
      order.trangThai === "approved" ||
      order.trangThai === "shipped" ||
      order.trangThai === "completed";
    const isRunning = order.trangThai === "in_production";

    const orderCode = order.code
      ? order.code
          .replace("DBH", "LSX")
          .replace("DHBL", "LSX")
          .replace("DH", "LSX")
      : order.id;

    return NextResponse.json({
      order: {
        id: orderCode,
        trangThai: isCompleted
          ? "completed"
          : isRunning
            ? "running"
            : "pending",
        ngayDat: order.ngayDat,
        ngayHoanThanh: order.ngayHoanThanhSanXuat || order.ngayGiao,
        // @ts-ignore
        ngayYeuCauQC: order.ngayYeuCauQC || order.ngayGiao,
        tongTien: order.tongTien,
      },
      items,
      materials: Array.from(materialMap.values()),
    });
  } catch (e) {
    console.error("[GET /api/production/orders/[id]]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orderId = params.id;
    // Thử khôi phục tiền tố để tìm code gốc
    const codeCandidates = [
      orderId,
      orderId.replace("LSX", "DBH"),
      orderId.replace("LSX", "DHBL"),
      orderId.replace("LSX", "DH"),
    ];

    const body = await req.json();
    const { trangThai, ngayYeuCauQC } = body;

    let order = null;

    // Tìm theo ID trước
    order = await prisma.saleOrder.findUnique({
      where: { id: orderId },
      include: { saleOrderItems: true },
    });

    if (!order) {
      for (const candidate of codeCandidates) {
        order = await prisma.saleOrder.findUnique({
          where: { code: candidate },
          include: { saleOrderItems: true },
        });
        if (order) break;
      }
    }

    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy lệnh sản xuất" },
        { status: 404 },
      );
    }

    // Nếu chỉ cập nhật ngày yêu cầu QC
    if (ngayYeuCauQC !== undefined && !trangThai) {
      await prisma.saleOrder.update({
        where: { id: order.id },
        // @ts-ignore
        data: { ngayYeuCauQC: ngayYeuCauQC ? new Date(ngayYeuCauQC) : null },
      });
      return NextResponse.json({ success: true, ngayYeuCauQC });
    }

    let newTrangThai = order.trangThai;
    if (trangThai === "running") newTrangThai = "in_production";
    else if (trangThai === "completed") newTrangThai = "completed";

    await prisma.$transaction(async (tx) => {
      await tx.saleOrder.update({
        where: { id: order.id },
        data: {
          trangThai: newTrangThai,
          ...(newTrangThai === "completed"
            ? { ngayHoanThanhSanXuat: new Date() }
            : {}),
        },
      });

      if (newTrangThai === "completed") {
        // Cập nhật trạng thái hoàn thành cho Task giao việc tương ứng
        const taskTitle = `Lệnh sản xuất cho đơn hàng ${order.code || order.id}`;
        await tx.task.updateMany({
          where: { title: taskTitle, status: { not: "done" } },
          data: { status: "done", completedAt: new Date() }
        });

        // Find QA users
        const qaUsers = await tx.employee.findMany({
          where: {
            status: "active",
            OR: [
              { departmentCode: { contains: "qa" } },
              { departmentName: { contains: "chất lượng" } },
              { departmentName: { contains: "Chất lượng" } },
            ],
          },
          select: { userId: true },
        });

        const qaUserIds = qaUsers
          .map((u) => u.userId)
          .filter(Boolean) as string[];

        let producedItems: string[] = [];
        let totalQty = 0;

        const prodTask = await tx.task.findFirst({
          where: {
            deptCode: "production",
            title: { contains: order.code || "" }
          }
        });

        if (prodTask && prodTask.actualResult) {
          try {
            const parsed = JSON.parse(prodTask.actualResult);
            for (const pt of parsed) {
              if (pt.tenHang) producedItems.push(pt.tenHang);
              if (pt.missingQty) totalQty += pt.missingQty;
            }
          } catch (e) {}
        } else if (prodTask && prodTask.description) {
          const lines = prodTask.description.split('\n');
          for (const line of lines) {
            if (line.startsWith('- ')) {
              const parts = line.substring(2).split(': ');
              if (parts.length === 2) {
                const tenHang = parts[0].trim();
                const qtyStr = parts[1].trim().split(' ')[0];
                const qty = parseFloat(qtyStr);
                if (!isNaN(qty)) {
                  producedItems.push(tenHang);
                  totalQty += qty;
                }
              }
            }
          }
        }

        const fallbackItems = (order.saleOrderItems || []).map((i: any) => i.tenHang);
        const finalItems = producedItems.length > 0 ? producedItems : fallbackItems;
        const fallbackQty = (order.saleOrderItems || []).reduce((acc: number, i: any) => acc + i.soLuong, 0);
        const finalQty = totalQty > 0 ? totalQty : fallbackQty;

        const productNameDesc = finalItems.length > 0 
          ? finalItems.join(", ") 
          : `Thành phẩm lệnh sản xuất ${order.code || order.id}`;

        const qcCode =
          "QC-" +
          new Date().toISOString().slice(0, 10).replace(/-/g, "") +
          "-" +
          Math.floor(100 + Math.random() * 900);
        const qcRequest = await tx.qualityInspection.create({
          data: {
            code: qcCode,
            type: "OQC", // Output Quality Control cho thành phẩm
            status: "Chưa thực hiện",
            productName: productNameDesc,
            requesterName:
              session.user.name || session.user.email || "Bộ phận sản xuất",
            requesterDept: "Sản xuất",
            // @ts-ignore
            executionTime: order.ngayYeuCauQC || order.ngayGiao || new Date(),
            notes: `Yêu cầu kiểm soát chất lượng cho đơn hàng ${order.code || order.id}`,
            metadata: JSON.stringify({
              productionOrder: order.code,
              bomCode: "BOM-" + (order.code || "").replace("DBH-", ""),
              model: finalItems[0] || productNameDesc,
              totalQuantity: finalQty,
              batch: "LOT-" + new Date().toISOString().slice(0, 10).replace(/-/g, ""),
              assemblyTeam: "Tổ lắp ráp - Ca ngày"
            })
          },
        });

        if (qaUserIds.length > 0) {
          // Tìm trưởng phòng QC để giao việc, nếu không thì giao cho người đầu tiên
          const qaHead = await tx.employee.findFirst({
            where: {
              status: "active",
              OR: [
                { departmentCode: { contains: "qa" }, position: { contains: "Trưởng" } },
                { departmentName: { contains: "chất lượng" }, position: { contains: "Trưởng" } },
                { departmentName: { contains: "Chất lượng" }, position: { contains: "Trưởng" } },
              ],
            },
            select: { userId: true },
          });
          const assigneeId = qaHead?.userId || qaUserIds[0];

          // Tự động tạo Task cho bộ phận QC
          await tx.task.create({
            data: {
              title: `Yêu cầu kiểm soát chất lượng cho đơn hàng ${order.code || order.id}`,
              description: `Mã phiếu QC: ${qcCode}\nThành phẩm: ${productNameDesc}`,
              assigneeId: assigneeId,
              creatorId: session.user.id,
              deptCode: "qa",
              priority: "high",
              status: "pending",
              dueDate: order.ngayYeuCauQC || order.ngayGiao || new Date(),
            },
          });

          const qcNotif = await tx.notification.create({
            data: {
              title: `🔬 Yêu cầu kiểm soát chất lượng`,
              content: `Yêu cầu kiểm soát chất lượng cho đơn hàng ${order.code || order.id}. (Mã phiếu: ${qcCode}).`,
              type: "warning",
              priority: "high",
              audienceType: "group",
              audienceValue: JSON.stringify(qaUserIds),
              createdById: session.user.id,
            },
          });

          await Promise.all(
            qaUserIds.map((uid) =>
              tx.notificationRecipient.upsert({
                where: {
                  notificationId_userId: {
                    notificationId: qcNotif.id,
                    userId: uid,
                  },
                },
                update: {},
                create: { notificationId: qcNotif.id, userId: uid },
              }),
            ),
          );
        }
      }
    });

    return NextResponse.json({ success: true, trangThai: newTrangThai });
  } catch (e) {
    console.error("[PATCH /api/production/orders/[id]]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
