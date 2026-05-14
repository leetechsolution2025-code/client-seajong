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
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const skip = (page - 1) * limit;

    const where: any = {};

    if (categoryId) {
      const allCategoryIds = await getCategoryIdsRecursive(categoryId);
      where.categoryId = { in: allCategoryIds };
    }

    const warehouseId = searchParams.get("warehouseId");
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

    // Xác định loại kho để lọc bảng dữ liệu tương ứng
    let warehouseType = "ALL";
    if (warehouseId) {
      const wh = await prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: { type: true }
      } as any);
      if (wh) warehouseType = (wh as any).type;
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
          ...(categoryId && { categoryId }),
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
          ...(categoryId && { categoryId }),
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
      }))
    ];

    // Sort combined
    allItems.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

    // Paginate manually
    const total = invTotal + matTotal;
    const paginated = allItems.slice(skip, skip + limit);

    const itemsWithStock = paginated.map(item => {
      const relevantStocks = warehouseId
        ? item.stocks.filter((s: any) => s.warehouseId === warehouseId)
        : item.stocks;

      const soLuong = relevantStocks.reduce((acc: number, s: any) => acc + s.soLuong, 0);
      let trangThai = "con-hang";
      if (soLuong === 0) trangThai = "het-hang";
      else if ((item.soLuongMin || 0) > 0 && soLuong <= (item.soLuongMin || 0)) trangThai = "sap-het";

      return {
        ...item,
        soLuong,
        trangThai,
      };
    });

    return NextResponse.json({
      items: itemsWithStock,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      tenHang, code, categoryId, brand, donVi, soLuongMin, giaNhap, giaBan, kieuDang, thongSoKyThuat, ghiChu, imageUrl
    } = body;

    if (!tenHang) return NextResponse.json({ error: "Thiếu tên hàng hoá" }, { status: 400 });

    const newItem = await (prisma as any).materialItem.create({
      data: {
        name: tenHang,
        code,
        categoryId,
        brand: brand || "Seajong",
        unit: donVi || "Cái",
        minStock: Number(soLuongMin) || 0,
        price: Number(giaNhap) || 0,
        giaBan: Number(giaBan) || 0,
        spec: kieuDang || "",
        thongSoKyThuat: thongSoKyThuat || "",
        ghiChu: ghiChu || "",
        imageUrl: imageUrl || null,
      } as any,
    });

    return NextResponse.json(newItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      id, tenHang, code, categoryId, brand, donVi, soLuongMin, giaNhap, giaBan, kieuDang, thongSoKyThuat, ghiChu, imageUrl, source
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
          donVi,
          soLuongMin: Number(soLuongMin) || 0,
          giaNhap: Number(giaNhap) || 0,
          giaBan: Number(giaBan) || 0,
          thongSoKyThuat,
          ghiChu,
          imageUrl,
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
        } as any,
      });
      return NextResponse.json(updated);
    }
  } catch (error: any) {
    console.error("[PUT /api/logistics/inventory]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
