import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { removeVietnameseTones } from "@/lib/utils";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const search = searchParams.get("search") ?? "";

    const categoryId = searchParams.get("categoryId") ?? "";
    const searchNorm = removeVietnameseTones(search);

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;

    const rawItems = await prisma.manufacturedProduct.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: search ? 1000 : PAGE_SIZE,
      skip: search ? 0 : (page - 1) * PAGE_SIZE,
      include: {
        category: { select: { name: true } },
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

    return NextResponse.json({ 
      items: paginated, 
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
    const { code, name, categoryId, unit, defaultWarehouse, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Tên sản phẩm không được để trống" }, { status: 400 });
    }

    const item = await prisma.manufacturedProduct.create({
      data: {
        code: code || undefined,
        name: name.trim(),
        categoryId: categoryId || undefined,
        unit: unit || "bộ",
        defaultWarehouse: defaultWarehouse || "KHO-THANHPHAM",
        notes: notes || undefined,
      }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/production/manufactured-products]", e);
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Mã sản phẩm đã tồn tại" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
