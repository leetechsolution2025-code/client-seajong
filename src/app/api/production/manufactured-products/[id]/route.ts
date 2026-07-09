import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { code, name, categoryId, unit, defaultWarehouse, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Tên sản phẩm không được để trống" }, { status: 400 });
    }

    // @ts-ignore
    const item = await prisma.manufacturedProduct.update({
      where: { id: params.id },
      data: {
        code: code || undefined,
        name: name.trim(),
        categoryId: categoryId || undefined,
        unit: unit || "bộ",
        defaultWarehouse: defaultWarehouse || "KHO-THANHPHAM",
        notes: notes || undefined,
      }
    });

    return NextResponse.json(item);
  } catch (e: any) {
    console.error("[PUT /api/production/manufactured-products/[id]]", e);
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Mã sản phẩm đã tồn tại" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore
    await prisma.manufacturedProduct.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[DELETE /api/production/manufactured-products/[id]]", e);
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
