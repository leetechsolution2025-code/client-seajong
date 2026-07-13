const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function GET(orderId) {
  try {
    let order = await prisma.saleOrder.findUnique({
      where: { id: orderId },
      include: { saleOrderItems: true }
    });

    if (!order) {
      order = await prisma.saleOrder.findUnique({
        where: { code: orderId },
        include: { saleOrderItems: true }
      });
    }

    if (!order) {
      return { error: "Không tìm thấy lệnh sản xuất", status: 404 };
    }

    const items = [];
    const materialMap = new Map();

    for (const orderItem of order.saleOrderItems) {
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
          const matId = vt.material?.id || vt.id;
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
              ghiChu: vt.ghiChu
            });
          }
        }
      }
    }

    const isCompleted = order.trangThai === "approved" || order.trangThai === "shipped";
    const isRunning = order.trangThai === "in_production";

    return {
      order: {
        id: order.code || order.id,
        trangThai: isCompleted ? "completed" : (isRunning ? "running" : "pending"),
        ngayDat: order.ngayDat,
        ngayHoanThanh: order.ngayHoanThanhSanXuat || order.ngayGiao,
        tongTien: order.tongTien
      },
      items,
      materials: Array.from(materialMap.values())
    };

  } catch (e) {
    console.error(e);
    return { error: "Internal Server Error", status: 500 };
  }
}

GET('DHBL-20260713-01').then(res => console.log(JSON.stringify(res, null, 2)));
