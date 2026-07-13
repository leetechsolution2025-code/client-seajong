import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

    const session = await getServerSession(authOptions);
    let activeIndustryCode = "wood_door";

    if (session) {
      const user = await prisma.user.findFirst({
        where: { email: session.user.email || "" },
        include: { client: { include: { industry: true } } }
      });

      if (user?.role === "SUPERADMIN") {
        const cookieHeader = req.headers.get("cookie") || "";
        const cookieCode = cookieHeader
          .split("; ")
          .find(row => row.startsWith("active_industry_code="))
          ?.split("=")[1];
        
        if (cookieCode) {
          activeIndustryCode = cookieCode;
        } else {
          const firstClient = await prisma.client.findFirst({
            include: { industry: true }
          });
          if (firstClient?.industry) {
            activeIndustryCode = firstClient.industry.code;
          }
        }
      } else if (user?.client?.industry) {
        activeIndustryCode = user.client.industry.code;
      } else {
        const client = await prisma.client.findFirst({
          include: { industry: true }
        });
        if (client?.industry) {
          activeIndustryCode = client.industry.code;
        }
      }
    } else {
      const client = await prisma.client.findFirst({
        include: { industry: true }
      });
      if (client?.industry) {
        activeIndustryCode = client.industry.code;
      }
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
    let warehouseCode = "";
    if (warehouseId) {
      const wh = await prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: { type: true, code: true }
      } as any);
      if (wh) {
        warehouseType = (wh as any).type;
        warehouseCode = (wh as any).code || "";
      }
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

    const mfpWhere: any = {};
    // Không lọc ManufacturedProduct theo categoryId vì nó dùng bảng Category khác với InventoryCategory
    // Thay vào đó, nếu không có search (tải danh sách kho) thì không trả về ManufacturedProduct để tránh loãng dữ liệu.
    // Nếu có search (tìm kiếm gợi ý) thì trả về để lọc in-memory.
    const includeManufactured = searchParams.get("includeManufactured") === "true";
    const excludeMaterials = searchParams.get("excludeMaterials") === "true";

    const [invItems, matItems, invTotal, matTotal, mfpItems, mfpTotal] = await Promise.all([
      // Chỉ lấy InventoryItem nếu không phải là kho MATERIAL (bao gồm PRODUCT và DEFECT)
      warehouseType !== "MATERIAL" && warehouseCode !== "KHO-THANHPHAM" ? prisma.inventoryItem.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          stocks: { include: { warehouse: true } },
        },
        orderBy: { updatedAt: "desc" },
      }) : Promise.resolve([]),

      // Chỉ lấy MaterialItem nếu là kho MATERIAL hoặc ALL, và không bị cấm bởi excludeMaterials
      !excludeMaterials && (warehouseType === "MATERIAL" || warehouseType === "ALL") ? (prisma as any).materialItem.findMany({
        where: {
          ...(categoryId ? { categoryId } : (industryCategoryIds.length > 0 ? { categoryId: { in: industryCategoryIds } } : {})),

        },
        include: {
          category: { select: { id: true, name: true } },
          stocks: { include: { warehouse: true } },
        },
        orderBy: { updatedAt: "desc" },
      }) : Promise.resolve([]),

      warehouseType !== "MATERIAL" && warehouseCode !== "KHO-THANHPHAM" ? prisma.inventoryItem.count({ where }) : Promise.resolve(0),
      !excludeMaterials && (warehouseType === "MATERIAL" || warehouseType === "ALL") ? (prisma as any).materialItem.count({
        where: {
          ...(categoryId ? { categoryId } : (industryCategoryIds.length > 0 ? { categoryId: { in: industryCategoryIds } } : {})),

        }
      }) : Promise.resolve(0),

      warehouseType !== "MATERIAL" && (includeManufactured || warehouseCode === "KHO-THANHPHAM") ? prisma.manufacturedProduct.findMany({
        where: {
          ...mfpWhere,
          ...(categoryId ? { productCategoryId: categoryId } : {})
        },
        include: { dinhMucs: true, productCategory: true },
        orderBy: { updatedAt: "desc" }
      }) : Promise.resolve([]),
      warehouseType !== "MATERIAL" && (includeManufactured || warehouseCode === "KHO-THANHPHAM") ? prisma.manufacturedProduct.count({ 
        where: {
          ...mfpWhere,
          ...(categoryId ? { productCategoryId: categoryId } : {})
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
      })),
      ...mfpItems.map((m: any) => ({
        id: m.id,
        tenHang: m.name,
        code: m.code,
        donVi: m.unit,
        giaNhap: 0,
        giaBan: m.giaBan || 0,
        categoryId: m.productCategoryId,
        category: m.productCategory ? { id: m.productCategory.id, name: m.productCategory.name } : null,
        stocks: [],
        dinhMucs: m.dinhMucs || [],
        updatedAt: m.updatedAt,
        source: "manufactured",
        imageUrl: m.imageUrl,
      }))
    ];

    // Không deduplicate nữa, để các nguồn dữ liệu độc lập với nhau
    const deduplicatedItems = allItems;

    // Compute total stats on allItems
    let tongGiaTri = 0;
    let hetHangCount = 0;
    let sapHetCount = 0;

    const allItemsWithStock = deduplicatedItems.map(item => {
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


    const removeAccents = (str: string) => {
      return str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
    };

    let filteredItems = allItemsWithStock;
    if (search) {
      const searchNormalized = removeAccents(search);
      filteredItems = allItemsWithStock.filter(item => {
        const nameNorm = removeAccents(item.tenHang);
        const codeNorm = removeAccents(item.code);
        const modelNorm = removeAccents(item.model);
        return nameNorm.includes(searchNormalized) || codeNorm.includes(searchNormalized) || modelNorm.includes(searchNormalized);
      });
    }

    // Paginate manually
    const total = search ? filteredItems.length : invTotal + matTotal + mfpTotal;
    const paginated = filteredItems.slice(skip, skip + limit);

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

    if (code) {
      const duplicateItem = await prisma.inventoryItem.findUnique({
        where: { code }
      });
      const duplicateMaterial = await (prisma as any).materialItem.findUnique({
        where: { code }
      });
      if (duplicateItem || duplicateMaterial) {
        return NextResponse.json({ error: "Mã định danh đã tồn tại trong hệ thống. Vui lòng sử dụng mã khác." }, { status: 400 });
      }
    }

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
          donVi: donVi || "cái",
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
          unit: donVi || "cái",
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

    if (code) {
      const duplicateItem = await prisma.inventoryItem.findFirst({
        where: { code, id: { not: id } }
      });
      const duplicateMaterial = await (prisma as any).materialItem.findFirst({
        where: { code, id: { not: id } }
      });
      if (duplicateItem || duplicateMaterial) {
        return NextResponse.json({ error: "Mã định danh đã tồn tại trong hệ thống. Vui lòng sử dụng mã khác." }, { status: 400 });
      }
    }

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
          unit: donVi || "cái",
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

