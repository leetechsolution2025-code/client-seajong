import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Tìm kho sản xuất và lắp ráp (KVP)
    const kvpWarehouse = await prisma.warehouse.findFirst({
      where: {
        OR: [
          { code: "KVP" },
          { name: { contains: "sản xuất" } }
        ]
      }
    });

    // 2. Lấy các hàng hoá trong kho sản xuất và lắp ráp có mã định mức
    const items = await prisma.inventoryItem.findMany({
      where: {
        stocks: kvpWarehouse ? { some: { warehouseId: kvpWarehouse.id } } : undefined,
        dinhMucs: {
          some: {
            code: { not: null }
          }
        }
      },
      include: {
        dinhMucs: {
          where: { code: { not: null } },
          select: {
            id: true,
            code: true,
            tenDinhMuc: true,
            giaBan: true,
            vatTu: {
              select: {
                id: true,
                maVatTu: true,
                tenVatTu: true,
                soLuong: true,
                donViTinh: true
              }
            }
          }
        },
        erpCategory: {
          select: { id: true, name: true, code: true }
        },
        category: {
          select: { id: true, name: true, code: true }
        }
      },
      orderBy: [{ code: "asc" }]
    });

    // 3. Chuẩn hoá dữ liệu trả về với phân nhóm danh mục
    const products = items.map((it) => {
      const primaryBom = it.dinhMucs[0];
      const catName =
        it.erpCategory?.name ||
        it.category?.name ||
        (it.tenHang.toLowerCase().includes("bát sen") ? "Bát sen & Phụ kiện" : "Khác");

      const bomCode = primaryBom?.code || "";
      const bomName = primaryBom?.tenDinhMuc || "";

      return {
        id: it.id,
        code: it.code || "",
        name: it.tenHang,
        categoryName: catName,
        specification: (it.donVi || "bộ").toUpperCase(),
        listedPrice: it.giaBan || 0,
        bomCode: bomCode,
        bomName: bomName,
        bomId: primaryBom?.id || "",
        note: "",
        imageUrl: it.imageUrl || undefined,
        specs: {
          "Mã sản phẩm": it.code || "",
          "Mã định mức (BOM)": bomCode,
          "Tên định mức": bomName,
          "Đơn vị tính": it.donVi || "bộ",
          "Kho lưu trữ": "Kho sản xuất và lắp ráp (KVP)",
          ...(it.chatLieu ? { "Chất liệu": it.chatLieu } : {}),
          ...(it.thongSoKyThuat ? { "Thông số kỹ thuật": it.thongSoKyThuat } : {})
        },
        originalData: {
          id: it.id,
          name: it.tenHang,
          price: it.giaBan || 0,
          images: it.imageUrl ? [it.imageUrl] : [],
          specs: {
            "Mã sản phẩm": it.code || "",
            "Mã định mức (BOM)": bomCode,
            "Tên định mức": bomName,
            "Đơn vị tính": it.donVi || "bộ",
            "Kho lưu trữ": "Kho sản xuất và lắp ráp (KVP)",
            ...(it.chatLieu ? { "Chất liệu": it.chatLieu } : {}),
            ...(it.thongSoKyThuat ? { "Thông số kỹ thuật": it.thongSoKyThuat } : {})
          },
          description: `Sản phẩm sản xuất & lắp ráp OEM theo định mức kỹ thuật ${bomCode}.`,
          bom: primaryBom,
          dinhMucs: it.dinhMucs
        }
      };
    });

    return NextResponse.json({
      success: true,
      total: products.length,
      products
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  } catch (error: any) {
    console.error("[GET /api/sales/pricing/oem] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
