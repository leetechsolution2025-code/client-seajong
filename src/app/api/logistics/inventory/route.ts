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
        const matCount = await prisma.inventoryItem.count({
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
    const reqTrangThai = searchParams.get("trangThai");
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
    }
    
    if (warehouseId) {
      if (warehouseType === "DEFECT") {
        where.stocks = { some: { warehouseId, soLuong: { gt: 0 } } };
      } else if (warehouseType === "PRODUCT_SYNC") {
        where.AND = [{ OR: [{ loai: { in: ["hang-hoa", "thanh-pham"] } }, { stocks: { some: { warehouseId } } }] }];
      } else if (warehouseType === "MATERIAL") {
        where.AND = [{ OR: [{ loai: "vat-tu" }, { stocks: { some: { warehouseId } } }] }];
      } else {
        where.stocks = { some: { warehouseId } };
      }
    }

    const includeManufactured = searchParams.get("includeManufactured") === "true";
    const excludeMaterials = searchParams.get("excludeMaterials") === "true";

    if (excludeMaterials && warehouseType === "ALL") {
      where.loai = { not: "vat-tu" };
    }

    const [invItems, invTotal] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, code: true } },
          erpCategory: { select: { id: true, name: true, code: true } },
          stocks: { include: { warehouse: true } },
          dinhMucs: { include: { vatTu: { include: { inventoryItem: { include: { stocks: { include: { warehouse: true } } } } } } } },
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

    // Restore deduplication: Merge items with same code/name and COMBINE their stocks and dinhMucs
    const deduplicatedMap = new Map();
    for (const item of allItems) {
      const key = item.code ? item.code.toLowerCase() : item.tenHang.toLowerCase();
      if (deduplicatedMap.has(key)) {
        const existing = deduplicatedMap.get(key);
        // Combine stocks
        existing.stocks = [...existing.stocks, ...item.stocks];
        // Combine dinhMucs
        if (item.dinhMucs && item.dinhMucs.length > 0) {
          const newDinhMucs = item.dinhMucs.filter((dm: any) => !existing.dinhMucs?.some((edm: any) => edm.id === dm.id));
          existing.dinhMucs = [...(existing.dinhMucs || []), ...newDinhMucs];
        }
      } else {
        deduplicatedMap.set(key, { ...item, stocks: [...item.stocks], dinhMucs: [...(item.dinhMucs || [])] });
      }
    }
    const deduplicatedItems = Array.from(deduplicatedMap.values());

    // Compute total stats on allItems
    let tongGiaTri = 0;
    let hetHangCount = 0;
    let sapHetCount = 0;

    const allItemsWithStock = deduplicatedItems.map(item => {
      // Khi chọn "Tất cả kho", hệ thống mặc định không cộng dồn hàng lỗi để tránh nhầm lẫn tồn kho bán được.
      // Nhưng nếu chọn đích danh Kho hàng lỗi (hoặc một kho cụ thể), ta giữ lại stock để tính toán.
      let relevantStocks = item.stocks;
      if (!warehouseId && !warehouseCode) {
        relevantStocks = item.stocks.filter((s: any) => s.warehouse?.code !== 'KHO-LOI');
      }

      if (warehouseCode === "KHO-CHINH" || warehouseCode === "KVP") {
        relevantStocks = relevantStocks.filter((s: any) => s.warehouse?.code === 'KHO-CHINH' || s.warehouse?.code === 'KVP');
      } else if (warehouseId) {
        relevantStocks = relevantStocks.filter((s: any) => s.warehouseId === warehouseId);
      }

      const soLuong = relevantStocks.reduce((acc: number, s: any) => acc + s.soLuong, 0);
      const soLuongGiu = relevantStocks.reduce((acc: number, s: any) => acc + (s.soLuongGiu || 0), 0);
      const thucTon = Math.max(0, soLuong - soLuongGiu);

      let trangThai = "con-hang";
      if (thucTon === 0) trangThai = "het-hang";
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
        soLuongGiu,
        thucTon,
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

    if (reqTrangThai) {
      filteredItems = filteredItems.filter(item => item.trangThai === reqTrangThai);
    }

    // Paginate manually
    const total = filteredItems.length;
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
    const { tenHang, code, categoryId, brand, donVi, soLuongMin, giaNhap, giaBan, kieuDang, thongSoKyThuat, ghiChu, imageUrl, warehouseId, chieuDai, chieuRong, chieuDay, source, material, maThayThe, chatLieu } = body;

    if (!tenHang) return NextResponse.json({ error: "Thiếu tên hàng hoá" }, { status: 400 });

    if (code) {
        const duplicateItem = await prisma.inventoryItem.findFirst({ where: { code } });
        if (duplicateItem) return NextResponse.json({ error: "Mã định danh đã tồn tại trong hệ thống. Vui lòng sử dụng mã khác." }, { status: 400 });
    }

    let mappedCategoryId = categoryId || null;
    let erpCatId = null;
    let loai = "vat-tu";
    
    if (source === "inventory") {
        loai = "hang-hoa";
        mappedCategoryId = categoryId || null;
    } else if (source === "manufactured") {
        loai = "thanh-pham";
        mappedCategoryId = await syncCategoryToInventory(categoryId || null);
    } else {
        loai = "vat-tu";
        mappedCategoryId = await syncCategoryToInventory(categoryId || null);
        erpCatId = categoryId || null;
    }

    const newItem = await prisma.inventoryItem.create({
        data: {
            tenHang,
            code,
            categoryId: mappedCategoryId,
            erpCategoryId: erpCatId,
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
            maThayThe: maThayThe || null,
            chatLieu: chatLieu || material || null,
            loai
        } as any
    });

    if (warehouseId) {
        await (prisma as any).inventoryStock.create({
            data: {
                inventoryItemId: newItem.id,
                warehouseId,
                soLuong: 0,
                soLuongMin: Number(soLuongMin) || 0,
                viTriHang: "Chờ sắp xếp"
            }
        });
    }

    return NextResponse.json(newItem);
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
      chieuDai, chieuRong, chieuDay, material, maThayThe, chatLieu
    } = body;

    if (!id) return NextResponse.json({ error: "Thiếu ID hàng hoá" }, { status: 400 });

    if (code) {
      let currentCode = "";
      if (source === "seajong") {
        const current = await prisma.seajongProduct.findUnique({ where: { id: Number(id) }, select: { slug: true } });
        currentCode = current?.slug || "";
      } else {
        const current = await prisma.inventoryItem.findUnique({ where: { id }, select: { code: true } });
        currentCode = current?.code || "";
      }

      if (code !== currentCode) {
        if (source === "seajong") {
          const duplicateSeajong = await prisma.seajongProduct.findFirst({ where: { slug: code, id: { not: Number(id) } } });
          if (duplicateSeajong) return NextResponse.json({ error: "Mã định danh đã tồn tại trong hệ thống. Vui lòng sử dụng mã khác." }, { status: 400 });
        } else {
          const duplicateItem = await prisma.inventoryItem.findFirst({ where: { code, id: { not: id } } });
          if (duplicateItem) return NextResponse.json({ error: "Mã định danh đã tồn tại trong hệ thống. Vui lòng sử dụng mã khác." }, { status: 400 });
        }
      }
    }

    if (source === "seajong") {
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
      let mappedCategoryId = categoryId || null;
      let erpCatId = null;

      if (source === "inventory") {
          mappedCategoryId = categoryId || null;
      } else {
          mappedCategoryId = await syncCategoryToInventory(categoryId || null);
          erpCatId = categoryId || null;
      }

      const updated = await prisma.inventoryItem.update({
        where: { id },
        data: {
          tenHang,
          code,
          categoryId: mappedCategoryId,
          ...(source === "material" ? { erpCategoryId: erpCatId } : {}),
          brand: brand || "Seajong",
          model: kieuDang || "",
          donVi,
          soLuongMin: Number(soLuongMin) || 0,
          giaNhap: Number(giaNhap) || 0,
          giaBan: Number(giaBan) || 0,
          thongSoKyThuat,
          ghiChu,
          imageUrl: imageUrl !== undefined ? imageUrl : undefined,
          chieuDai: chieuDai ? parseFloat(chieuDai) : null,
          chieuRong: chieuRong ? parseFloat(chieuRong) : null,
          chieuDay: chieuDay ? parseFloat(chieuDay) : null,
          maThayThe: maThayThe || null,
          chatLieu: chatLieu !== undefined ? chatLieu : (material !== undefined ? material : undefined)
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

    if (source === "seajong") {
      await prisma.seajongProduct.delete({ where: { id: Number(id) } });
    } else {
      const item = await prisma.inventoryItem.findUnique({ where: { id } });
      if (item && item.code) {
        let text = "Xoá hàng hoá/vật tư";
        if (item.loai === "thanh-pham") text = "Xoá thành phẩm";
        else if (item.loai === "vat-tu") text = "Xoá vật tư";
        await deleteAutoJournalByReference(item.code, text);
      }
      
      await prisma.dinhMucVatTu.updateMany({
        where: { inventoryItemId: id },
        data: { inventoryItemId: null }
      });
      await prisma.stockMovement.deleteMany({ where: { inventoryItemId: id } });
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
