import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/board/category-types/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { label, icon, color, prefix } = body;
    const row = await prisma.categoryTypeDef.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    const updated = await prisma.categoryTypeDef.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(prefix !== undefined && { prefix }),
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/board/category-types/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const row = await prisma.categoryTypeDef.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    if (row.isSystem) return NextResponse.json({ error: "Không thể xoá loại hệ thống" }, { status: 403 });
    await prisma.categoryTypeDef.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
