import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Hàm đệ quy để lấy toàn bộ ID danh mục con
async function getCategoryIdsRecursive(categoryId: string): Promise<string[]> {
  const ids = [categoryId];
  const children = await prisma.inventoryCategory.findMany({
    where: { parentId: categoryId } as any,
    select: { id: true },
  });

  for (const child of children) {
    const childIds = await getCategoryIdsRecursive(child.id);
    ids.push(...childIds);
  }
  return ids;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    if (action === "next-sequence") {
      const catId = searchParams.get("categoryId");
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      let count = 0;
      if (catId) {
        const matCount = await (prisma as any).materialItem.count({
          where: {
            categoryId: catId,
            createdAt: { gte: startOfToday }
          }
        });
        const invCount = await prisma.inventoryItem.count({
          where: {
            categoryId: catId,
            createdAt: { gte: startOfToday }
          }
        });
        count = matCount + invCount;
      }
      return NextResponse.json({ nextSeq: count + 1 });
    }

    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const skip = (page - 1) * limit;

    // Đọc active_industry_code để lọc
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

    const industry = await prisma.industry.findUnique({
      where: { code: activeIndustryCode }
    });

    // 1. Lấy danh mục vật tư sản xuất (Materials) của ngành
    let industryCategoryIds: string[] = [];
    if (industry) {
      const rootCategory = await prisma.category.findFirst({
        where: { code: industry.rootCategoryCode, type: "vat_tu_san_xuat", isActive: true }
      });
      if (rootCategory) {
        const categories = await prisma.category.findMany({
          where: { type: "vat_tu_san_xuat", isActive: true },
          select: { id: true, parentId: true }
        });
        const descendantIds = [rootCategory.id];
        const collectDescendants = (parentId: string) => {
          categories.forEach(cat => {
            if (cat.parentId === parentId) {
              descendantIds.push(cat.id);
              collectDescendants(cat.id);
            }
          });
        };
        collectDescendants(rootCategory.id);
        industryCategoryIds = descendantIds;
      }
    }

    // 2. Lấy danh mục sản phẩm (InventoryCategory) của ngành
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

    const warehouseId = searchParams.get("warehouseId");
    // Xác định loại kho để lọc bảng dữ liệu tương ứng
    let warehouseType = "ALL";
    if (warehouseId) {
      const wh = await prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: { type: true }
      } as any);
      if (wh) warehouseType = (wh as any).type;
    }

    const where: any = {};

    if (categoryId) {
      const allCategoryIds = await getCategoryIdsRecursive(categoryId);
      where.categoryId = { in: allCategoryIds };
    } else if (industryProdCategoryIds.length > 0) {
      where.categoryId = { in: industryProdCategoryIds };
    }

    if (warehouseId) {
      where.stocks = {
        some: { warehouseId }
      };
    }

    if (search) {
      where.OR = [
        { tenHang: { contains: search } },
        { code: { contains: search } },
        { model: { contains: search } },
      ];
    }

    const [invItems, matItems, invTotal, matTotal] = await Promise.all([
      // Chỉ lấy InventoryItem nếu không phải là kho MATERIAL (bao gồm PRODUCT và DEFECT)
      warehouseType !== "MATERIAL" ? prisma.inventoryItem.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          stocks: { include: { warehouse: true } },
        },
        orderBy: { updatedAt: "desc" },
      }) : Promise.resolve([]),

      // Chỉ lấy MaterialItem nếu là kho MATERIAL hoặc xem tất cả
      (warehouseType === "MATERIAL" || warehouseType === "ALL") ? (prisma as any).materialItem.findMany({
        where: {
          ...(categoryId ? { categoryId } : (industryCategoryIds.length > 0 ? { categoryId: { in: industryCategoryIds } } : {})),
          ...(search && {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
              { spec: { contains: search } },
            ]
          })
        },
        include: {
          category: { select: { id: true, name: true } },
          stocks: { include: { warehouse: true } },
        },
        orderBy: { updatedAt: "desc" },
      }) : Promise.resolve([]),

      warehouseType !== "MATERIAL" ? prisma.inventoryItem.count({ where }) : Promise.resolve(0),
      (warehouseType === "MATERIAL" || warehouseType === "ALL") ? (prisma as any).materialItem.count({
        where: {
          ...(categoryId ? { categoryId } : (industryCategoryIds.length > 0 ? { categoryId: { in: industryCategoryIds } } : {})),
          ...(search && {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
            ]
          })
        }
      }) : Promise.resolve(0),
    ]);

    // Map and Merge
    const allItems = [
      ...invItems.map((it: any) => ({
        ...it,
        source: "inventory",
        categoryName: it.category?.name
      })),
      ...matItems.map((it: any) => ({
        id: it.id,
        tenHang: it.name,
        code: it.code,
        donVi: it.unit,
        giaNhap: it.price,
        giaBan: it.giaBan || 0,
        brand: it.brand,
        model: it.spec,
        color: it.brand,
        soLuongMin: it.minStock,
        categoryId: it.categoryId,
        category: it.category,
        categoryName: it.category?.name,
        stocks: it.stocks,
        updatedAt: it.updatedAt,
        source: "material",
        kieuDang: it.spec,
        spec: it.spec,
        thongSoKyThuat: it.thongSoKyThuat,
        ghiChu: it.ghiChu,
        imageUrl: it.imageUrl,
        chieuDai: it.chieuDai,
        chieuRong: it.chieuRong,
        chieuDay: it.chieuDay,
      }))
    ];

    // Compute total stats on allItems
    let tongGiaTri = 0;
    let hetHangCount = 0;
    let sapHetCount = 0;

    const allItemsWithStock = allItems.map(item => {
      const relevantStocks = warehouseId
        ? item.stocks.filter((s: any) => s.warehouseId === warehouseId)
        : item.stocks;

      const soLuong = relevantStocks.reduce((acc: number, s: any) => acc + s.soLuong, 0);
      let trangThai = "con-hang";
      if (soLuong === 0) trangThai = "het-hang";
      else if ((item.soLuongMin || 0) > 0 && soLuong <= (item.soLuongMin || 0)) trangThai = "sap-het";

      const price = item.giaNhap || item.giaBan || 0;
      tongGiaTri += soLuong * price;

      if (soLuong === 0) {
        hetHangCount++;
      } else if ((item.soLuongMin || 0) > 0 && soLuong <= (item.soLuongMin || 0)) {
        sapHetCount++;
      }

      return {
        ...item,
        soLuong,
        trangThai,
      };
    });

    // Sort combined
    allItemsWithStock.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

    // Paginate manually
    const total = invTotal + matTotal;
    const paginated = allItemsWithStock.slice(skip, skip + limit);

    return NextResponse.json({
      items: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        tongMatHang: total,
        tongGiaTri,
        hetHang: hetHangCount,
        sapHet: sapHetCount,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      tenHang, code, categoryId, brand, donVi, soLuongMin, giaNhap, giaBan, kieuDang, thongSoKyThuat, ghiChu, imageUrl, warehouseId,
      chieuDai, chieuRong, chieuDay
    } = body;

    if (!tenHang) return NextResponse.json({ error: "Thiếu tên hàng hoá" }, { status: 400 });

    // Kiểm tra xem categoryId thuộc về InventoryCategory hay Category
    const isInventoryCategory = categoryId ? await prisma.inventoryCategory.findUnique({
      where: { id: categoryId }
    }) : null;

    if (isInventoryCategory) {
      // Tạo InventoryItem (Thành phẩm)
      const newItem = await prisma.inventoryItem.create({
        data: {
          tenHang,
          code,
          categoryId,
          brand: brand || "Seajong",
          model: kieuDang || "",
          donVi: donVi || "Cái",
          soLuongMin: Number(soLuongMin) || 0,
          giaNhap: Number(giaNhap) || 0,
          giaBan: Number(giaBan) || 0,
          thongSoKyThuat: thongSoKyThuat || "",
          ghiChu: ghiChu || "",
          imageUrl: imageUrl || null,
          soLuong: 0,
          trangThai: "het-hang",
          chieuDai: chieuDai ? parseFloat(chieuDai) : null,
          chieuRong: chieuRong ? parseFloat(chieuRong) : null,
          chieuDay: chieuDay ? parseFloat(chieuDay) : null,
        } as any,
      });

      // Nếu có warehouseId, tạo tồn kho ban đầu (InventoryStock)
      if (warehouseId) {
        await (prisma as any).inventoryStock.create({
          data: {
            inventoryItemId: newItem.id,
            warehouseId,
            soLuong: 0,
            viTriHang: "Chờ sắp xếp"
          }
        });
      }

      return NextResponse.json(newItem);
    } else {
      // Tạo MaterialItem (Vật tư sản xuất)
      const newItem = await (prisma as any).materialItem.create({
        data: {
          name: tenHang,
          code,
          categoryId: categoryId || null,
          brand: brand || "Seajong",
          unit: donVi || "Cái",
          minStock: Number(soLuongMin) || 0,
          price: Number(giaNhap) || 0,
          giaBan: Number(giaBan) || 0,
          spec: kieuDang || "",
          thongSoKyThuat: thongSoKyThuat || "",
          ghiChu: ghiChu || "",
          imageUrl: imageUrl || null,
          chieuDai: chieuDai ? parseFloat(chieuDai) : null,
          chieuRong: chieuRong ? parseFloat(chieuRong) : null,
          chieuDay: chieuDay ? parseFloat(chieuDay) : null,
        } as any,
      });

      // Nếu có warehouseId, tạo tồn kho ban đầu (MaterialStock)
      if (warehouseId) {
        await prisma.materialStock.create({
          data: {
            materialId: newItem.id,
            warehouseId,
            soLuong: 0,
            soLuongMin: Number(soLuongMin) || 0,
          }
        });
      }

      return NextResponse.json(newItem);
    }
  } catch (error: any) {
    console.error("[POST /api/logistics/inventory]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      id, tenHang, code, categoryId, brand, donVi, soLuongMin, giaNhap, giaBan, kieuDang, thongSoKyThuat, ghiChu, imageUrl, source,
      chieuDai, chieuRong, chieuDay
    } = body;

    if (!id) return NextResponse.json({ error: "Thiếu ID hàng hoá" }, { status: 400 });

    if (source === "inventory") {
      // Cập nhật InventoryItem (Hàng hoá từ website)
      const updated = await prisma.inventoryItem.update({
        where: { id },
        data: {
          tenHang,
          code,
          categoryId: categoryId || null,
          brand,
          model: kieuDang || "",
          donVi,
          soLuongMin: Number(soLuongMin) || 0,
          giaNhap: Number(giaNhap) || 0,
          giaBan: Number(giaBan) || 0,
          thongSoKyThuat,
          ghiChu,
          imageUrl,
          chieuDai: chieuDai ? parseFloat(chieuDai) : null,
          chieuRong: chieuRong ? parseFloat(chieuRong) : null,
          chieuDay: chieuDay ? parseFloat(chieuDay) : null,
        } as any,
      });
      return NextResponse.json(updated);
    } else {
      // Cập nhật MaterialItem (Vật tư sản xuất)
      const updated = await (prisma as any).materialItem.update({
        where: { id },
        data: {
          name: tenHang,
          code,
          categoryId: categoryId || null,
          brand: brand || "Seajong",
          unit: donVi || "Cái",
          minStock: Number(soLuongMin) || 0,
          price: Number(giaNhap) || 0,
          giaBan: Number(giaBan) || 0,
          spec: kieuDang || "",
          thongSoKyThuat: thongSoKyThuat || "",
          ghiChu: ghiChu || "",
          imageUrl: imageUrl || null,
          chieuDai: chieuDai ? parseFloat(chieuDai) : null,
          chieuRong: chieuRong ? parseFloat(chieuRong) : null,
          chieuDay: chieuDay ? parseFloat(chieuDay) : null,
        } as any,
      });
      return NextResponse.json(updated);
    }
  } catch (error: any) {
    console.error("[PUT /api/logistics/inventory]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const source = searchParams.get("source") || "material";

    if (!id) return NextResponse.json({ error: "Thiếu ID hàng hoá" }, { status: 400 });

    if (source === "inventory") {
      await prisma.stockMovement.deleteMany({ where: { inventoryItemId: id } });
      await prisma.inventoryItem.delete({ where: { id } });
    } else {
      await prisma.dinhMucVatTu.updateMany({
        where: { materialId: id },
        data: { materialId: null }
      });
      await prisma.materialStock.deleteMany({ where: { materialId: id } });
      await (prisma as any).materialItem.delete({ where: { id } });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[DELETE /api/logistics/inventory]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

