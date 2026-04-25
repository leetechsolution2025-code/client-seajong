import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/plan-finance/categories?type=customer_group
 * Trả về danh sách Category theo type, sắp xếp theo sortOrder.
 * Dùng chung cho tất cả bộ lọc cần lấy từ DB.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const type = req.nextUrl.searchParams.get("type");
    if (!type) return NextResponse.json({ error: "type is required" }, { status: 400 });

    const categories = await prisma.category.findMany({
      where: { type, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, color: true, icon: true, parentId: true },
    });

    return NextResponse.json(categories);
  } catch (e) {
    console.error("[GET /api/plan-finance/categories]", e);
    return NextResponse.json([], { status: 500 });
  }
}

/**
 * POST /api/plan-finance/categories
 * Thêm category mới vào DB.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { type, name, code, color, icon, sortOrder } = body;

    if (!type || !name) {
      return NextResponse.json({ error: "type và name là bắt buộc" }, { status: 400 });
    }

    // Tự sinh code nếu không có
    const resolvedCode = code?.trim() ||
      `${type.slice(0, 3)}-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6)}`;

    const category = await prisma.category.create({
      data: {
        type,
        code: resolvedCode,
        name: name.trim(),
        color: color || null,
        icon: icon || null,
        sortOrder: sortOrder ?? 0,
        isActive: true,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/plan-finance/categories]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/plan-finance/categories?id=xxx
 * Xoá mềm (isActive = false) một category.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await prisma.category.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
