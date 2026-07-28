import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { attachWebImages } from "@/lib/sync-utils";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteAutoJournalByReference } from "@/lib/accounting-engine";
import { syncCategoryToInventory } from "@/lib/sync-utils";

// Hàm đệ quy để lấy toàn bộ ID danh mục con
async function getErpCategoryIdsRecursive(categoryId: string): Promise<string[]> {
  const ids = [categoryId];
  const children = await prisma.category.findMany({
    where: { parentId: categoryId } as any,
    select: { id: true },
  });

  for (const child of children) {
    const childIds = await getErpCategoryIdsRecursive(child.id);
    ids.push(...childIds);
  }
  return ids;
}

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


async function buildKvpCategoryFilter(prismaClient: any, categoryId: string) {
  const cat = await prismaClient.category.findUnique({ where: { id: categoryId }, select: { code: true } });
  const invCat = await prismaClient.inventoryCategory.findUnique({ where: { id: categoryId }, select: { code: true } });
  const targetCode = cat?.code || invCat?.code;

  if (targetCode) {
    return {
      OR: [
        { category: { code: targetCode } },
        { erpCategory: { code: targetCode } }
      ]
    };
  }
  return {
    OR: [
      { categoryId },
      { erpCategoryId: categoryId }
    ]
  };
}

async function buildKhoChinhCategoryFilter(categoryId: string) {
  const allCategoryIds = await getCategoryIdsRecursive(categoryId);
  return {
    OR: [
      { categoryId: { in: allCategoryIds } },
      { erpCategoryId: { in: allCategoryIds } }
    ]
  };
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
    const exactCode = searchParams.get("exactCode");
    const nolimit = searchParams.get("nolimit") === "true";
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const skip = (page - 1) * limit;

    const session = await getServerSession(authOptions);
    let activeIndustryCode = "sanitary";

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
    let reqWarehouseCode = searchParams.get("warehouseCode");

    // Xác định loại kho để lọc bảng dữ liệu tương ứng
    let warehouseType = "ALL";
    let warehouseCode = reqWarehouseCode || "";
    if (warehouseId) {
      const wh = await prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: { type: true, code: true }
      } as any);
      if (wh) {
        warehouseType = (wh as any).type;
        warehouseCode = (wh as any).code || "";
      }
    } else if (warehouseCode) {
      const wh = await prisma.warehouse.findUnique({
        where: { code: warehouseCode },
        select: { type: true }
      } as any);
      if (wh) {
        warehouseType = (wh as any).type;
      }
    }

    // Fetch synced category ids
    const syncedCategories = await prisma.category.findMany({
      where: { type: { in: ['danh_muc_thanh_pham', 'vat_tu_san_xuat'] } },
      select: { id: true }
    });
    const syncedIds = syncedCategories.map(c => c.id);

    const where: any = {};

    if (exactCode) {
      where.OR = [
        { maThayThe: exactCode },
        { code: exactCode }
      ];
    } else if (categoryId) {
      if (warehouseCode === "KVP" || warehouseType === "MATERIAL") {
        const filter = await buildKvpCategoryFilter(prisma, categoryId);
        where.OR = filter.OR;
      } else if (warehouseCode === "KHO-CHINH" || warehouseType === "PRODUCT_SYNC") {
        const filter = await buildKhoChinhCategoryFilter(categoryId);
        where.OR = filter.OR;
      } else {
        // Mặc định dùng hàm của kho chính hoặc đệ quy
        const allCategoryIds = await getCategoryIdsRecursive(categoryId);
        where.OR = [
          { categoryId: { in: allCategoryIds } },
          { erpCategoryId: { in: allCategoryIds } }
        ];
      }
    } else if (industryProdCategoryIds.length > 0) {
      where.OR = [
        { categoryId: { in: industryProdCategoryIds } },
        { categoryId: { in: syncedIds } },
        { categoryId: null }
      ];
    }

    // DO NOT filter by physical stocks for normal warehouses to show the full catalog.
    // BUT for DEFECT warehouses (Kho hàng lỗi), we ONLY show items that actually exist in this warehouse.
    if (warehouseId && warehouseType === "DEFECT") {
      where.stocks = { some: { warehouseId, soLuong: { gt: 0 } } };
    }

    const includeManufactured = searchParams.get("includeManufactured") === "true";
    const excludeMaterials = searchParams.get("excludeMaterials") === "true";

    if (warehouseType === "PRODUCT_SYNC") {
      where.loai = "hang-hoa";
    } else if (warehouseType === "MATERIAL") {
      where.loai = "vat-tu";
    } else if (warehouseType === "PRODUCT") {
      where.loai = "thanh-pham";
    }
    
    if (excludeMaterials && warehouseType === "ALL") {
      where.loai = { not: "vat-tu" };
    }

    const [invItems, invTotal] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          erpCategory: { select: { name: true } },
          stocks: { include: { warehouse: true } },
          dinhMucs: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.inventoryItem.count({ where })
    ]);

    const allItems = invItems.map((it: any) => ({
      ...it,
      source: it.loai === "hang-hoa" ? "inventory" : (it.loai === "vat-tu" ? "material" : "manufactured"),
      categoryName: it.category?.name ?? it.erpCategory?.name,
      dinhMucs: it.dinhMucs || []
    }));

    // Restore deduplication: Merge items with same code/name and COMBINE their stocks
    const deduplicatedMap = new Map();
    for (const item of allItems) {
      const key = item.code ? item.code.toLowerCase() : item.tenHang.toLowerCase();
      if (deduplicatedMap.has(key)) {
        const existing = deduplicatedMap.get(key);
        // Combine stocks
        existing.stocks = [...existing.stocks, ...item.stocks];
      } else {
        deduplicatedMap.set(key, { ...item, stocks: [...item.stocks] });
      }
    }
    const deduplicatedItems = Array.from(deduplicatedMap.values());

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
      return str ? str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() : '';
    };

    let filteredItems = allItemsWithStock;
    if (search) {
      const searchNormalized = removeAccents(search);
      filteredItems = allItemsWithStock.filter(item => {
        const nameNorm = removeAccents(item.tenHang);
        const codeNorm = removeAccents(item.code);
        const modelNorm = removeAccents(item.model || '');
        return nameNorm.includes(searchNormalized) || codeNorm.includes(searchNormalized) || modelNorm.includes(searchNormalized);
      });
    }

    // Paginate manually
    const total = search ? filteredItems.length : invTotal;
    const paginated = nolimit ? filteredItems : filteredItems.slice(skip, skip + limit);
    
    const paginatedWithImages = await attachWebImages(paginated);

    return NextResponse.json({
      items: paginatedWithImages,
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
    const { tenHang, code, categoryId, brand, donVi, soLuongMin, giaNhap, giaBan, kieuDang, thongSoKyThuat, ghiChu, imageUrl, warehouseId, chieuDai, chieuRong, chieuDay, source, material, maThayThe } = body;

    if (!tenHang) return NextResponse.json({ error: "Thiếu tên hàng hoá" }, { status: 400 });

    if (code) {
      if (source === "inventory") {
        const duplicateItem = await prisma.inventoryItem.findUnique({ where: { code } });
        if (duplicateItem) return NextResponse.json({ error: "Mã định danh đã tồn tại trong hệ thống. Vui lòng sử dụng mã khác." }, { status: 400 });
      } else if (source === "manufactured") {
        const duplicateManufactured = await prisma.inventoryItem.findUnique({ where: { code } });
        if (duplicateManufactured) return NextResponse.json({ error: "Mã định danh đã tồn tại trong hệ thống. Vui lòng sử dụng mã khác." }, { status: 400 });
      } else {
        const duplicateMaterial = await (prisma as any).materialItem.findUnique({ where: { code } });
        if (duplicateMaterial) return NextResponse.json({ error: "Mã định danh đã tồn tại trong hệ thống. Vui lòng sử dụng mã khác." }, { status: 400 });
      }
    }

    if (source === "manufactured") {
      const newItem = await prisma.inventoryItem.create({
        data: {
          code,
          name: tenHang,
          categoryId: categoryId || undefined,
          unit: donVi || "bộ",
          defaultWarehouse: warehouseId || "KHO-CHINH",
          notes: ghiChu || undefined,
          giaBan: Number(giaBan) || 0,
          imageUrl: imageUrl || null,
        } as any
      });

      // Tạo InventoryItem đồng bộ
      if (code) {
        const mappedCategoryId = await syncCategoryToInventory(newItem.categoryId);
        await prisma.inventoryItem.create({
          data: {
            code,
            tenHang,
            categoryId: mappedCategoryId,
            brand: brand || "Seajong",
            model: kieuDang || "",
            donVi: donVi || "bộ",
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
            loai: "thanh-pham",
            version: maThayThe || null
          } as any
        });
        
        // Tạo tồn kho ban đầu (InventoryStock)
        if (warehouseId) {
          const invItem = await prisma.inventoryItem.findUnique({ where: { code } });
          if (invItem) {
            await (prisma as any).inventoryStock.create({
              data: {
                inventoryItemId: invItem.id,
                warehouseId,
                soLuong: 0,
                viTriHang: "Chờ sắp xếp"
              }
            });
          }
        }
      }

      return NextResponse.json(newItem);
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
          version: maThayThe || null
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
          material: material || null,
          thongSoKyThuat: thongSoKyThuat || "",
          ghiChu: ghiChu || "",
          imageUrl: imageUrl || null,
          chieuDai: chieuDai ? parseFloat(chieuDai) : null,
          chieuRong: chieuRong ? parseFloat(chieuRong) : null,
          chieuDay: chieuDay ? parseFloat(chieuDay) : null,
        } as any,
      });

      const mappedCategoryId = await syncCategoryToInventory(newItem.categoryId);
      if (newItem.code) {
        await prisma.inventoryItem.upsert({
          where: { code: newItem.code },
          create: {
            code: newItem.code,
            tenHang: newItem.name,
            loai: "vat-tu",
            brand: newItem.brand || "Seajong",
            categoryId: mappedCategoryId,
            donVi: newItem.unit || "cái",
            soLuongMin: newItem.minStock || 0,
            giaNhap: newItem.price || 0,
            giaBan: (newItem as any).giaBan || 0,
            thongSoKyThuat: newItem.thongSoKyThuat || "",
            imageUrl: newItem.imageUrl || null,
            chieuDai: (newItem as any).chieuDai || null,
          },
          update: {
            tenHang: newItem.name,
            loai: "vat-tu",
            categoryId: mappedCategoryId,
            donVi: newItem.unit || "cái",
            soLuongMin: newItem.minStock || 0,
            giaNhap: newItem.price || 0,
            giaBan: (newItem as any).giaBan || 0,
            thongSoKyThuat: newItem.thongSoKyThuat || "",
            imageUrl: newItem.imageUrl || null,
            chieuDai: (newItem as any).chieuDai || null,
          }
        });
      }

      // Nếu có warehouseId, tạo tồn kho ban đầu (MaterialStock)
      if (warehouseId) {
        await prisma.inventoryStock.create({
          data: {
            inventoryItemId: newItem.id,
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
      chieuDai, chieuRong, chieuDay, material, maThayThe
    } = body;

    if (!id) return NextResponse.json({ error: "Thiếu ID hàng hoá" }, { status: 400 });

    if (code) {
      let currentCode = "";
      if (source === "inventory") {
        const current = await prisma.inventoryItem.findUnique({ where: { id }, select: { code: true } });
        currentCode = current?.code || "";
      } else if (source === "manufactured") {
        const current = await prisma.inventoryItem.findUnique({ where: { id }, select: { code: true } });
        currentCode = current?.code || "";
      } else {
        const current = await (prisma as any).materialItem.findUnique({ where: { id }, select: { code: true } });
        currentCode = current?.code || "";
      }

      if (code !== currentCode) {
        if (source === "inventory") {
          const duplicateItem = await prisma.inventoryItem.findFirst({ where: { code, id: { not: id } } });
          if (duplicateItem) return NextResponse.json({ error: "Mã định danh đã tồn tại trong hệ thống. Vui lòng sử dụng mã khác." }, { status: 400 });
        } else if (source === "manufactured") {
          const duplicateManufactured = await prisma.inventoryItem.findFirst({ where: { code, id: { not: id } } });
          if (duplicateManufactured) return NextResponse.json({ error: "Mã định danh đã tồn tại trong hệ thống. Vui lòng sử dụng mã khác." }, { status: 400 });
        } else if (source === "seajong") {
          const duplicateSeajong = await prisma.seajongProduct.findFirst({ where: { slug: code, id: { not: Number(id) } } });
          if (duplicateSeajong) return NextResponse.json({ error: "Mã định danh đã tồn tại trong hệ thống. Vui lòng sử dụng mã khác." }, { status: 400 });
        } else {
          const duplicateMaterial = await (prisma as any).materialItem.findFirst({ where: { code, id: { not: id } } });
          if (duplicateMaterial) return NextResponse.json({ error: "Mã định danh đã tồn tại trong hệ thống. Vui lòng sử dụng mã khác." }, { status: 400 });
        }
      }
    }

    if (source === "inventory") {
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
          version: maThayThe || null
        } as any,
      });
      return NextResponse.json(updated);
    } else if (source === "manufactured") {
      const oldProduct = await prisma.inventoryItem.findUnique({ where: { id }, select: { code: true } });
      const oldCode = oldProduct?.code;

      // Cập nhật ManufacturedProduct
      const updated = await prisma.inventoryItem.update({
        where: { id },
        data: {
          code,
          name: tenHang,
          categoryId: categoryId || undefined,
          unit: donVi || "bộ",
          notes: ghiChu || undefined,
          giaBan: Number(giaBan) || 0,
          imageUrl: imageUrl || null,
        } as any
      });
      
      // ĐỒNG BỘ Cập nhật InventoryItem
      if (code) {
        const mappedCategoryId = await syncCategoryToInventory(updated.categoryId);
        
        if (oldCode && oldCode !== code) {
          await prisma.inventoryItem.updateMany({
            where: { code: oldCode },
            data: { code: code }
          });
        }

        await prisma.inventoryItem.upsert({
          where: { code: code },
          create: {
            code: code,
            tenHang: tenHang,
            loai: "thanh-pham",
            brand: brand || "Seajong",
            categoryId: mappedCategoryId,
            donVi: donVi || "bộ",
            ghiChu: ghiChu || "",
            imageUrl: imageUrl || null,
            giaBan: Number(giaBan) || 0,
            model: kieuDang || "",
            soLuongMin: Number(soLuongMin) || 0,
            giaNhap: Number(giaNhap) || 0,
            thongSoKyThuat: thongSoKyThuat || "",
            chieuDai: chieuDai ? parseFloat(chieuDai) : null,
            chieuRong: chieuRong ? parseFloat(chieuRong) : null,
            chieuDay: chieuDay ? parseFloat(chieuDay) : null,
          } as any,
          update: {
            tenHang: tenHang,
            brand: brand || "Seajong",
            categoryId: mappedCategoryId,
            donVi: donVi || "bộ",
            ghiChu: ghiChu || "",
            imageUrl: imageUrl || null,
            giaBan: Number(giaBan) || 0,
            model: kieuDang || "",
            soLuongMin: Number(soLuongMin) || 0,
            giaNhap: Number(giaNhap) || 0,
            thongSoKyThuat: thongSoKyThuat || "",
            chieuDai: chieuDai ? parseFloat(chieuDai) : null,
            chieuRong: chieuRong ? parseFloat(chieuRong) : null,
            chieuDay: chieuDay ? parseFloat(chieuDay) : null,
          } as any
        });
      }
      return NextResponse.json(updated);
    } else if (source === "seajong") {
      // Cập nhật SeajongProduct
      const updated = await prisma.seajongProduct.update({
        where: { id: Number(id) },
        data: {
          name: tenHang,
          slug: code || undefined,
          price: Number(giaBan) || Number(giaNhap) || undefined,
          description: thongSoKyThuat || undefined,
          images: imageUrl ? JSON.stringify([imageUrl]) : undefined,
        }
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
          material: material || null,
          thongSoKyThuat: thongSoKyThuat || "",
          ghiChu: ghiChu || "",
          imageUrl: imageUrl || null,
          chieuDai: chieuDai ? parseFloat(chieuDai) : null,
          chieuRong: chieuRong ? parseFloat(chieuRong) : null,
          chieuDay: chieuDay ? parseFloat(chieuDay) : null,
        } as any,
      });

      const mappedCategoryId = await syncCategoryToInventory(updated.categoryId);
      if (updated.code) {
        await prisma.inventoryItem.upsert({
          where: { code: updated.code },
          create: {
            code: updated.code,
            tenHang: updated.name,
            loai: "vat-tu",
            brand: updated.brand || "Seajong",
            categoryId: mappedCategoryId,
            donVi: updated.unit || "cái",
            soLuongMin: updated.minStock || 0,
            giaNhap: updated.price || 0,
            giaBan: (updated as any).giaBan || 0,
            thongSoKyThuat: updated.thongSoKyThuat || "",
            imageUrl: updated.imageUrl || null,
            chieuDai: (updated as any).chieuDai || null,
          },
          update: {
            tenHang: updated.name,
            loai: "vat-tu",
            categoryId: mappedCategoryId,
            donVi: updated.unit || "cái",
            soLuongMin: updated.minStock || 0,
            giaNhap: updated.price || 0,
            giaBan: (updated as any).giaBan || 0,
            thongSoKyThuat: updated.thongSoKyThuat || "",
            imageUrl: updated.imageUrl || null,
            chieuDai: (updated as any).chieuDai || null,
          }
        });
      }

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
      const item = await prisma.inventoryItem.findUnique({ where: { id } });
      if (item && item.code) {
         await deleteAutoJournalByReference(item.code, "Xoá mã hàng hoá");
      }
      await prisma.stockMovement.deleteMany({ where: { inventoryItemId: id } });
      await prisma.inventoryItem.delete({ where: { id } });
    } else if (source === "manufactured") {
      const item = await prisma.inventoryItem.findUnique({ where: { id } });
      if (item && item.code) {
         await deleteAutoJournalByReference(item.code, "Xoá thành phẩm");
      }
      await prisma.inventoryItem.delete({ where: { id } });
    } else if (source === "seajong") {
      await prisma.seajongProduct.delete({ where: { id: Number(id) } });
    } else {
      const item = await prisma.inventoryItem.findUnique({ where: { id } });
      if (item && item.code) {
         await deleteAutoJournalByReference(item.code, "Xoá vật tư");
      }
      await prisma.dinhMucVatTu.updateMany({
        where: { inventoryItemId: id },
        data: { inventoryItemId: null }
      });
      await prisma.inventoryStock.deleteMany({ where: { inventoryItemId: id } });
      await prisma.inventoryItem.delete({ where: { id } });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[DELETE /api/logistics/inventory]", error);
    if (error?.code === "P2003") {
      return NextResponse.json({ error: "Không thể xoá vì mặt hàng này đang được dùng trong Phiếu kho/Đơn hàng/Định mức." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

