import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

/**
 * GET /api/plan-finance/inventory/stock-snapshot
 *
 * Trả về TOÀN BỘ danh sách InventoryItem để dùng trong phiếu kiểm kho.
 * Những mặt hàng chưa có tồn (tồn = 0 hoặc chưa từng nhập) VẪN xuất hiện.
 *
 * Query:
 *   warehouseId? — nếu có: hiện tồn tại kho đó + vị trí; nếu không: hiện tổng tồn toàn hệ thống
 *
 * Response: [{
 *   inventoryItemId, tenHang, maSku, donVi, giaNhap, categoryId, categoryName, trangThai,
 *   soLuongHeTong, soLuongMin,
 *   warehouseId?, warehouseName?, viTriHang?, viTriCot?, viTriTang?,
 * }]
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const warehouseId = searchParams.get("warehouseId");

  // Đọc active_industry_code để lọc theo ngành hàng (loại doanh nghiệp)
  const cookieHeader = req.headers.get("cookie") || "";
  let activeIndustryCode = cookieHeader
    .split("; ")
    .find(row => row.startsWith("active_industry_code="))
    ?.split("=")[1];

  if (!activeIndustryCode) {
    const client = await prisma.client.findFirst({
      include: { industry: true }
    });
    if (client?.industry) {
      activeIndustryCode = client.industry.code;
    }
  }

  if (!activeIndustryCode) {
    activeIndustryCode = "wood_door";
  }

  let industryProdCategoryIds: string[] = [];
  const industryProductCodeMap: Record<string, string> = {
    "wood_door": "SP_GO",
    "sanitary": "SP_VESINH",
    "building_materials": "SP_VLXD"
  };
  const prodRootCode = industryProductCodeMap[activeIndustryCode] || "SP_GO";
  const prodRootCategory = await prisma.inventoryCategory.findFirst({
    where: { code: prodRootCode, parentId: null, isActive: true }
  });
  if (prodRootCategory) {
    const categories = await prisma.inventoryCategory.findMany({
      where: { isActive: true },
      select: { id: true, parentId: true }
    });
    const descendantIds = [prodRootCategory.id];
    const collectDescendants = (parentId: string) => {
      categories.forEach(cat => {
        if (cat.parentId === parentId) {
          descendantIds.push(cat.id);
          collectDescendants(cat.id);
        }
      });
    };
    collectDescendants(prodRootCategory.id);
    industryProdCategoryIds = descendantIds;
  }

  let whFilter: any = {};
  if (warehouseId) {
    const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId }, select: { code: true } });
    if (wh?.code === "KHO-THANHPHAM") whFilter = { loai: "thanh-pham" };
    else if (wh?.code === "KVP") whFilter = { loai: "vat-tu" };
    else if (wh?.code === "KHO-CHINH") whFilter = { loai: "hang-hoa" };
    else if (wh?.code === "KHO-LOI") whFilter = { stocks: { some: { warehouseId: warehouseId, soLuong: { gt: 0 } } } };
  }

  // Fetch synced category ids
  const syncedCategories = await prisma.category.findMany({
    where: { type: { in: ['danh_muc_thanh_pham', 'vat_tu_san_xuat'] } },
    select: { id: true }
  });
  const syncedIds = syncedCategories.map(c => c.id);

  const isManufactured = whFilter.loai === "thanh-pham" || whFilter.loai === "vat-tu";
  
  const items = await prisma.inventoryItem.findMany({
    where: {
      ...whFilter,
      ...(!isManufactured && industryProdCategoryIds.length > 0 ? {
        OR: [
          { categoryId: { in: industryProdCategoryIds } },
          { categoryId: { in: syncedIds } },
          { categoryId: null } // Bao gồm các vật tư, thành phẩm được đồng bộ
        ]
      } : {})
    },
    select: {
      id:         true,
      code:       true,
      tenHang:    true,
      donVi:      true,
      giaNhap:    true,
      soLuongMin:        true,
      thongSoKyThuat:    true,
      trangThai:         true,
      categoryId: true,
      category:   { select: { name: true } },
      stocks: warehouseId
        ? {
            where:   { warehouseId },
            select:  { soLuong: true, soLuongMin: true, viTriHang: true, viTriCot: true, viTriTang: true },
          }
        : {
            select:  { soLuong: true, soLuongMin: true },
          },
    },
    orderBy: { tenHang: "asc" },
  });

  if (warehouseId) {
    const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId }, select: { name: true } });

    // Cho phép hiển thị tất cả hàng hoá để người dùng có thể nhập tồn kho đầu kỳ
    return NextResponse.json(items.map(it => {
      type StockLocated = { soLuong: number; soLuongMin: number; viTriHang: string | null; viTriCot: string | null; viTriTang: string | null };
      const stock = (it.stocks as StockLocated[])[0] ?? null;
      return {
        inventoryItemId: it.id,
        tenHang:         it.tenHang,
        maSku:           it.code,
        donVi:           it.donVi,
        giaNhap:         it.giaNhap,
        trangThai:       it.trangThai,
        categoryId:      it.categoryId,
        categoryName:    it.category?.name ?? null,
        thongSoKyThuat:  it.thongSoKyThuat ?? null,
        soLuongHeTong:   stock?.soLuong    ?? 0,
        soLuongMin:      Math.max(stock?.soLuongMin ?? 0, it.soLuongMin),
        warehouseId,
        warehouseName:   wh?.name ?? "",
        viTriHang:       stock?.viTriHang  ?? null,
        viTriCot:        stock?.viTriCot   ?? null,
        viTriTang:       stock?.viTriTang  ?? null,
      };
    }));
  } else {
    return NextResponse.json(items.map(it => {
      type StockBasic = { soLuong: number; soLuongMin: number };
      const allStocks     = it.stocks as StockBasic[];
      const soLuongHeTong = allStocks.reduce((s, st) => s + st.soLuong, 0);
      const soLuongMinKho = allStocks.length > 0 ? Math.max(...allStocks.map(st => st.soLuongMin)) : 0;
      return {
        inventoryItemId: it.id,
        tenHang:         it.tenHang,
        maSku:           it.code,
        donVi:           it.donVi,
        giaNhap:         it.giaNhap,
        trangThai:       it.trangThai,
        categoryId:      it.categoryId,
        categoryName:    it.category?.name ?? null,
        thongSoKyThuat:  it.thongSoKyThuat ?? null,
        soLuongHeTong,
        soLuongMin:      Math.max(soLuongMinKho, it.soLuongMin),
        chuaPhanKho:     allStocks.length === 0,  // true nếu chưa từng phân vào kho nào
      };
    }));
  }
}
