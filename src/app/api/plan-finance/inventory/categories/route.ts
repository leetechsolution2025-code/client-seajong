import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/plan-finance/inventory/categories
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cats = await prisma.inventoryCategory.findMany({
      where:   { isActive: true },
      orderBy: { sortOrder: "asc" },
      select:  { id: true, name: true, code: true },
    });
    return NextResponse.json(cats);
  } catch (e) {
    console.error("[GET /inventory/categories]", e);
    return NextResponse.json([]);
  }
}

// POST /api/plan-finance/inventory/categories — thêm mới nhanh
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Tên danh mục không được rỗng" }, { status: 400 });

    // Tự sinh code và sortOrder
    const count = await prisma.inventoryCategory.count();
    const code  = "CAT" + String(count + 1).padStart(3, "0");

    const cat = await prisma.inventoryCategory.create({
      data: { name: name.trim(), code, sortOrder: count + 1 },
      select: { id: true, name: true, code: true },
    });
    return NextResponse.json(cat, { status: 201 });
  } catch (e) {
    console.error("[POST /inventory/categories]", e);
    return NextResponse.json({ error: "Lỗi tạo danh mục" }, { status: 500 });
  }
}
