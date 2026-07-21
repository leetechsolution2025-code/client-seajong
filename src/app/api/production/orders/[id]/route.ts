import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orderId = params.id;
    const dbOrderId = orderId.replace('LSX', 'DHBL');

    // Lấy thông tin lệnh sản xuất
    let order = await prisma.saleOrder.findUnique({
      where: { id: dbOrderId },
      include: {
        saleOrderItems: true
      }
    });

    if (!order) {
      order = await prisma.saleOrder.findUnique({
        where: { code: dbOrderId },
        include: {
          saleOrderItems: true
        }
      });
    }

    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy lệnh sản xuất" }, { status: 404 });
    }

    // Bóc tách vật tư
    const items = [];
    const materialMap = new Map<string, any>();

    for (const orderItem of order.saleOrderItems) {
      // Tìm sản phẩm cấu thành (ManufacturedProduct) theo tên hàng
      const product = await prisma.manufacturedProduct.findFirst({
        where: { name: orderItem.tenHang },
        include: {
          dinhMucs: {
            include: {
              vatTu: {
                include: {
                  material: true,
                  category: true
                }
              }
            }
          }
        }
      });

      const bom = product?.dinhMucs?.[0] || null;

      if (bom) {
        items.push({
          id: orderItem.id,
          tenHang: orderItem.tenHang,
          soLuong: orderItem.soLuong,
          donGia: orderItem.donGia,
          bomFound: true
        });
        for (const vt of bom.vatTu) {
          const matId = vt.material?.id || vt.id; // Fallback if material is null
          const totalQty = vt.soLuong * orderItem.soLuong;
          
          if (materialMap.has(matId)) {
            const existing = materialMap.get(matId);
            existing.soLuong += totalQty;
          } else {
            materialMap.set(matId, {
              id: matId,
              tenVatTu: vt.material?.name || vt.tenVatTu,
              code: vt.material?.code || "-",
              soLuong: totalQty,
              donViTinh: vt.material?.unit || vt.donViTinh || "cái",
              donGia: vt.material?.price || 0,
              ghiChu: vt.ghiChu
            });
          }
        }
      }
    }

    const isCompleted = order.trangThai === "approved" || order.trangThai === "shipped" || order.trangThai === "completed";
    const isRunning = order.trangThai === "in_production";
    
    const orderCode = order.code ? order.code.replace('DHBL', 'LSX') : order.id;

    return NextResponse.json({
      order: {
        id: orderCode,
        trangThai: isCompleted ? "completed" : (isRunning ? "running" : "pending"),
        ngayDat: order.ngayDat,
        ngayHoanThanh: order.ngayHoanThanhSanXuat || order.ngayGiao,
        ngayYeuCauQC: order.ngayYeuCauQC || order.ngayGiao,
        tongTien: order.tongTien
      },
      items,
      materials: Array.from(materialMap.values())
    });

  } catch (e) {
    console.error("[GET /api/production/orders/[id]]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orderId = params.id;
    const dbOrderId = orderId.replace('LSX', 'DHBL');
    const body = await req.json();
    const { trangThai, ngayYeuCauQC } = body;

    let order = await prisma.saleOrder.findUnique({ 
      where: { id: dbOrderId },
      include: { saleOrderItems: true }
    });
    if (!order) {
      order = await prisma.saleOrder.findUnique({ 
        where: { code: dbOrderId },
        include: { saleOrderItems: true }
      });
    }

    if (!order) {
      return NextResponse.json({ error: "Không tìm thấy lệnh sản xuất" }, { status: 404 });
    }

    // Nếu chỉ cập nhật ngày yêu cầu QC
    if (ngayYeuCauQC !== undefined && !trangThai) {
      await prisma.saleOrder.update({
        where: { id: order.id },
        data: { ngayYeuCauQC: ngayYeuCauQC ? new Date(ngayYeuCauQC) : null }
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
          ...(newTrangThai === "completed" ? { ngayHoanThanhSanXuat: new Date() } : {})
        }
      });

      if (newTrangThai === "completed") {
        // Find QA users
        const qaUsers = await tx.employee.findMany({
          where: {
            status: "active",
            OR: [
              { departmentCode: { contains: "qa" } },
              { departmentName: { contains: "chất lượng" } },
              { departmentName: { contains: "Chất lượng" } }
            ]
          },
          select: { userId: true }
        });

        const qaUserIds = qaUsers.map(u => u.userId).filter(Boolean) as string[];

        let producedItems: string[] = [];
        for (const item of order.saleOrderItems) {
           const product = await tx.manufacturedProduct.findFirst({
             where: { name: item.tenHang },
             include: { dinhMucs: true }
           });
           if (product && product.dinhMucs.length > 0) {
             producedItems.push(`${item.tenHang} (x${item.soLuong})`);
           }
        }
        const productNameDesc = producedItems.length > 0 
           ? producedItems.join(", ") 
           : `Thành phẩm lệnh sản xuất ${order.code || order.id}`;

        const qcCode = "QC-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + Math.floor(100 + Math.random() * 900);
        const qcRequest = await tx.qualityInspection.create({
          data: {
            code: qcCode,
            type: "OQC", // Output Quality Control cho thành phẩm
            status: "Chưa thực hiện",
            productName: productNameDesc,
            requesterName: session.user.name || session.user.email || "Bộ phận sản xuất",
            requesterDept: "Sản xuất",
            executionTime: order.ngayYeuCauQC || order.ngayGiao || new Date(),
            notes: `Yêu cầu kiểm tra chất lượng thành phẩm sau khi hoàn thành sản xuất đơn hàng ${order.code || order.id}`
          }
        });

        if (qaUserIds.length > 0) {
          const qcNotif = await tx.notification.create({
            data: {
              title: `🔬 Yêu cầu kiểm tra chất lượng (OQC) mới`,
              content: `Lệnh sản xuất ${order.code || order.id} đã hoàn thành. Vui lòng kiểm tra chất lượng (Mã phiếu: ${qcCode}).`,
              type: "warning",
              priority: "high",
              audienceType: "group",
              audienceValue: JSON.stringify(qaUserIds),
              createdById: session.user.id
            }
          });
          
          await Promise.all(
            qaUserIds.map(uid =>
              tx.notificationRecipient.upsert({
                where: { notificationId_userId: { notificationId: qcNotif.id, userId: uid } },
                update: {},
                create: { notificationId: qcNotif.id, userId: uid }
              })
            )
          );
        }
      }
    });

    return NextResponse.json({ success: true, trangThai: newTrangThai });
  } catch (e) {
    console.error("[PATCH /api/production/orders/[id]]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
