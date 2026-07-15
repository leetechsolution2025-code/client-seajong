import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncCategoryToInventory } from "@/lib/sync-utils";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { code, name, categoryId, unit, defaultWarehouse, notes, giaBan } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Tên sản phẩm không được để trống" }, { status: 400 });
    }

    // @ts-ignore
    const item = await prisma.manufacturedProduct.update({
      where: { id: params.id },
      data: {
        code: code || undefined,
        name: name.trim(),
        productCategoryId: categoryId || undefined,
        unit: unit || "bộ",
        defaultWarehouse: defaultWarehouse || "KHO-THANHPHAM",
        notes: notes || undefined,
        giaBan: giaBan !== undefined ? Number(giaBan) : undefined,
      } as any
    });

    // ĐỒNG BỘ
    if (item.code) {
      const mappedCategoryId = await syncCategoryToInventory(item.productCategoryId);
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

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { giaBan } = body;

    if (giaBan !== undefined) {
      // @ts-ignore
      const item = await prisma.manufacturedProduct.update({
        where: { id: params.id },
        data: { giaBan: Number(giaBan) } as any
      });

      // ĐỒNG BỘ
      if (item.code) {
        const mappedCategoryId = await syncCategoryToInventory(item.productCategoryId);
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
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[PATCH /api/production/manufactured-products/[id]]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
