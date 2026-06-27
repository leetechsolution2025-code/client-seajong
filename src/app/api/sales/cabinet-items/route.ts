import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const items = await prisma.cabinetCategoryItem.findMany({
      orderBy: { code: "asc" },
    });
    return NextResponse.json(items);
  } catch (error: any) {
    console.error("[Cabinet Items GET Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, name, description, length, depth, height, unitPrice, unit, imageUrl1, imageUrl2 } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Mã và Tên gọi là bắt buộc." }, { status: 400 });
    }

    const newItem = await prisma.cabinetCategoryItem.create({
      data: {
        code,
        name,
        description: description || null,
        length: length ? parseFloat(String(length)) : null,
        depth: depth ? parseFloat(String(depth)) : null,
        height: height ? parseFloat(String(height)) : null,
        unitPrice: unitPrice ? parseFloat(String(unitPrice)) : 0,
        unit: unit || "cái",
        imageUrl1: imageUrl1 || null,
        imageUrl2: imageUrl2 || null,
      },
    });

    return NextResponse.json(newItem);
  } catch (error: any) {
    console.error("[Cabinet Items POST Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, code, name, description, length, depth, height, unitPrice, unit, imageUrl1, imageUrl2 } = body;

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID hạng mục cần cập nhật." }, { status: 400 });
    }

    const updatedItem = await prisma.cabinetCategoryItem.update({
      where: { id },
      data: {
        code,
        name,
        description: description ?? undefined,
        length: length ? parseFloat(String(length)) : null,
        depth: depth ? parseFloat(String(depth)) : null,
        height: height ? parseFloat(String(height)) : null,
        unitPrice: unitPrice ? parseFloat(String(unitPrice)) : 0,
        unit: unit ?? undefined,
        imageUrl1: imageUrl1 ?? undefined,
        imageUrl2: imageUrl2 ?? undefined,
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error: any) {
    console.error("[Cabinet Items PUT Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID hạng mục cần xóa." }, { status: 400 });
    }

    await prisma.cabinetCategoryItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Cabinet Items DELETE Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
