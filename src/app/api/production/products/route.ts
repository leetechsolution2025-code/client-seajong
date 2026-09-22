import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim().toLowerCase() || "";

    // 1. Lấy tất cả hàng hoá trong tất cả các kho kèm thông tin tồn kho và định mức
    const items = await prisma.inventoryItem.findMany({
      include: {
        stocks: {
          include: {
            warehouse: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        dinhMucs: {
          select: {
            id: true,
            code: true,
            tenDinhMuc: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
    });

    // 2. Gom nhóm và loại bỏ trùng lặp (Deduplication) giữa các kho
    // Nếu cùng tên hàng hoặc cùng mã thì chỉ hiển thị một bản ghi duy nhất, gộp thông tin kho và định mức
    const deduplicatedMap = new Map<string, any>();

    for (const item of items) {
      const normName = (item.tenHang || "").trim().toLowerCase().replace(/\s+/g, " ");
      const normCode = (item.code || "").trim().toLowerCase();
      if (!normName && !normCode) continue;

      // Khóa gom nhóm: ưu tiên theo tên hàng chuẩn hoá, hoặc mã sản phẩm
      const key = normName || normCode;

      const itemStockQty = item.stocks.reduce((sum: number, s: any) => sum + (s.soLuong || 0), 0);
      const itemWarehouseNames = item.stocks
        .map((s: any) => s.warehouse?.name || s.warehouse?.code)
        .filter(Boolean);

      if (deduplicatedMap.has(key)) {
        const existing = deduplicatedMap.get(key);

        // Gộp danh sách kho
        itemWarehouseNames.forEach((wName: string) => {
          if (!existing.warehouses.includes(wName)) {
            existing.warehouses.push(wName);
          }
        });
        existing.totalStock += itemStockQty;

        // Ưu tiên bản ghi có định mức BOM hoặc là hàng hoá thương mại
        const shouldUpgrade =
          (!existing.hasBom && item.dinhMucs.length > 0) ||
          (existing.loai === "vat-tu" && item.loai === "hang-hoa");

        if (shouldUpgrade) {
          existing.id = item.id;
          if (item.code) existing.code = item.code;
          existing.name = item.tenHang;
          if (item.donVi) existing.unit = item.donVi;
          existing.loai = item.loai;
        }

        // Kế thừa mã định mức BOM nếu có
        if (item.dinhMucs.length > 0) {
          existing.hasBom = true;
          if (!existing.bomCode) {
            existing.bomId = item.dinhMucs[0].id;
            existing.bomCode = item.dinhMucs[0].code;
            existing.bomName = item.dinhMucs[0].tenDinhMuc;
          }
        }
      } else {
        deduplicatedMap.set(key, {
          id: item.id,
          code: item.code || null,
          name: item.tenHang,
          unit: item.donVi || "cái",
          loai: item.loai,
          hasBom: item.dinhMucs.length > 0,
          bomId: item.dinhMucs[0]?.id || null,
          bomCode: item.dinhMucs[0]?.code || null,
          bomName: item.dinhMucs[0]?.tenDinhMuc || null,
          warehouses: itemWarehouseNames,
          totalStock: itemStockQty,
        });
      }
    }

    let result = Array.from(deduplicatedMap.values());

    // 3. Lọc theo từ khóa tìm kiếm nếu có
    if (q) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code && p.code.toLowerCase().includes(q)) ||
          (p.bomCode && p.bomCode.toLowerCase().includes(q))
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[GET /api/production/products] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
