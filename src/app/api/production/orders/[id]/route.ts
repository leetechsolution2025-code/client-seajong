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

    // Lấy thông tin lệnh sản xuất
    let order = await prisma.saleOrder.findUnique({
      where: { id: orderId },
      include: {
        saleOrderItems: true
      }
    });

    if (!order) {
      order = await prisma.saleOrder.findUnique({
        where: { code: orderId },
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

      items.push({
        id: orderItem.id,
        tenHang: orderItem.tenHang,
        soLuong: orderItem.soLuong,
        donGia: orderItem.donGia,
        bomFound: !!bom
      });

      if (bom) {
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

    const isCompleted = order.trangThai === "approved" || order.trangThai === "shipped";
    const isRunning = order.trangThai === "in_production";

    return NextResponse.json({
      order: {
        id: order.code || order.id,
        trangThai: isCompleted ? "completed" : (isRunning ? "running" : "pending"),
        ngayDat: order.ngayDat,
        ngayHoanThanh: order.ngayHoanThanhSanXuat || order.ngayGiao,
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
