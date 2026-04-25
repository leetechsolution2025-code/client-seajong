import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/board/categories?type=expense_type
export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type") ?? undefined;
    const rows = await prisma.category.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: { parent: { select: { id: true, name: true } } },
    });
    return NextResponse.json(rows);
  } catch (e) {
    console.error("[GET /api/board/categories]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/board/categories
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, code, name, color, icon, description, sortOrder, parentId } = body;
    if (!type || !code || !name) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // Kiểm tra trùng code trong cùng type
    const existing = await prisma.category.findUnique({ where: { type_code: { type, code } } });
    if (existing) return NextResponse.json({ error: "Mã đã tồn tại trong loại danh mục này" }, { status: 409 });

    const row = await prisma.category.create({
      data: { type, code: code.toLowerCase().trim(), name: name.trim(), color, icon, description, sortOrder: sortOrder ?? 0, parentId: parentId ?? null },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
