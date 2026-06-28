import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/admin/departments/[id] — Cập nhật
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { code, nameVi, nameEn, group, icon, description, sortOrder, isActive } = body;

  if (code && !/^[a-z0-9_]+$/.test(code)) {
    return NextResponse.json({ error: "Mã định danh không hợp lệ." }, { status: 400 });
  }

  try {
    const dept = await prisma.departmentCategory.update({
      where: { id },
      data: {
        ...(code      && { code: code.trim().toLowerCase() }),
        ...(nameVi    && { nameVi: nameVi.trim() }),
        ...(nameEn    && { nameEn: nameEn.trim() }),
        ...(group     && { group: group.trim() }),
        icon:        icon?.trim()        || null,
        description: description?.trim() || null,
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
        ...(isActive  !== undefined && { isActive }),
      },
    });
    return NextResponse.json(dept);
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Mã định danh đã tồn tại." }, { status: 409 });
    }
    return NextResponse.json({ error: "Không tìm thấy bản ghi." }, { status: 404 });
  }
}

// DELETE /api/admin/departments/[id] — Xoá
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.departmentCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Không tìm thấy bản ghi." }, { status: 404 });
  }
}
