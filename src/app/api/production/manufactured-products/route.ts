import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncCategoryToInventory } from "@/lib/sync-utils";
import { removeVietnameseTones } from "@/lib/utils";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    let pageVal = parseInt(searchParams.get("page") || "1");
    if (isNaN(pageVal)) pageVal = 1;
    const page = Math.max(1, pageVal);
    
    const search = searchParams.get("search") || "";
    let productCategoryId = searchParams.get("categoryId") || "";
    if (productCategoryId === "undefined" || productCategoryId === "null") productCategoryId = "";
    
    const searchNorm = removeVietnameseTones(search);

    import("fs").then(fs => fs.appendFileSync("/tmp/seajong-api-log.txt", `[API Call] page=${page} search='${search}' categoryId='${productCategoryId}'\n`));

    const where: any = {};
    if (productCategoryId) where.productCategoryId = productCategoryId;

    const rawItems = await prisma.manufacturedProduct.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: search ? 1000 : PAGE_SIZE,
      skip: search ? 0 : (page - 1) * PAGE_SIZE,
      include: {
        productCategory: { select: { name: true } },
        dinhMucs: { select: { id: true, code: true, tenDinhMuc: true } }
      }
    });

    const filtered = search
      ? rawItems.filter((it: any) => {
          const nameNorm = removeVietnameseTones(it.name);
          const codeNorm = removeVietnameseTones(it.code ?? "");
          return nameNorm.includes(searchNorm) || codeNorm.includes(searchNorm);
        })
      : rawItems;

    const total = search ? filtered.length : await prisma.manufacturedProduct.count({ where });
    const paginated = search
      ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
      : filtered;

    const itemCodes = paginated.map((p: any) => p.code).filter(Boolean);
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { code: { in: itemCodes } },
      include: { stocks: { select: { soLuong: true } } }
    });
    const invMap = new Map(inventoryItems.map(inv => [inv.code, inv]));

    const mappedItems = paginated.map((item: any) => {
      let soLuong = 0;
      let trangThai = "het-hang";
      let giaNhap = 0;
      let giaBan = 0;
      
      if (item.code) {
        const invItem = invMap.get(item.code) as any;
        if (invItem) {
          giaNhap = invItem.giaNhap || 0;
          giaBan = invItem.giaBan || 0;
          if (invItem.stocks) {
            soLuong = invItem.stocks.reduce((sum: number, s: any) => sum + s.soLuong, 0);
            trangThai = soLuong > 0 ? "con-hang" : "het-hang";
          }
        }
      }

      return {
        ...item,
        tenHang: item.name,
        categoryId: item.productCategoryId,
        category: item.productCategory,
        dinhMuc: item.dinhMucs?.[0] || null,
        source: "manufactured",
        soLuong,
        trangThai,
        giaNhap,
        giaBan
      };
    });

    return NextResponse.json({ 
      items: mappedItems, 
      total, 
      page, 
      totalPages: Math.ceil(total / PAGE_SIZE) 
    });
  } catch (e) {
    console.error("[GET /api/production/manufactured-products]", e);
    return NextResponse.json({ items: [], total: 0, page: 1, totalPages: 1 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { code, name, productCategoryId, unit, defaultWarehouse, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Tên sản phẩm không được để trống" }, { status: 400 });
    }

    const item = await prisma.manufacturedProduct.create({
      data: {
        code: code || undefined,
        name: name.trim(),
        productCategoryId: productCategoryId || undefined,
        unit: unit || "bộ",
        defaultWarehouse: defaultWarehouse || "KHO-THANHPHAM",
        notes: notes || undefined,
      }
    });

    const mappedCategoryId = await syncCategoryToInventory(item.productCategoryId);

    // ĐỒNG BỘ: Tự động tạo InventoryItem để có thể Kiểm Kho / Xuất Kho
    if (item.code) {
      await prisma.inventoryItem.upsert({
        where: { code: item.code },
        create: {
          code: item.code,
          tenHang: item.name,
          loai: "thanh-pham",
          brand: "Seajong",
          categoryId: mappedCategoryId,
          donVi: item.unit || "bộ",
          ghiChu: item.notes || "",
          imageUrl: null,
          giaBan: (item as any).giaBan || 0,
        },
        update: {
          tenHang: item.name,
          loai: "thanh-pham",
          categoryId: mappedCategoryId,
          donVi: item.unit || "bộ",
          ghiChu: item.notes || "",
          giaBan: (item as any).giaBan || 0,
        }
      });
    }

    return NextResponse.json(item, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/production/manufactured-products]", e);
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Mã sản phẩm đã tồn tại" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
