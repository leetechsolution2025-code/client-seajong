import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const items = await (prisma as any).hrSupplyItem.findMany({
      where: {
        isActive: true
      },
      include: {
        category: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("[STATIONERY_ITEMS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, code, categoryId, unit, minStock, currentStock, price, isAsset, note } = body;

    if (!name || !categoryId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const item = await (prisma as any).hrSupplyItem.create({
      data: {
        name,
        code: code || null, // Đảm bảo mã không bị chuỗi rỗng
        categoryId,
        unit: unit || "cái",
        minStock: isNaN(Number(minStock)) ? 0 : Number(minStock),
        currentStock: isNaN(Number(currentStock)) ? 0 : Number(currentStock),
        price: isNaN(Number(price)) ? 0 : Number(price),
        isAsset: !!isAsset,
        note: note || ""
      },
      include: {
        category: true
      }
    });

    return NextResponse.json(item);
  } catch (error: any) {
    console.error("[STATIONERY_ITEMS_POST_ERROR]", error);
    // Trả về thông báo lỗi chi tiết hơn nếu có thể
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, code, categoryId, unit, minStock, currentStock, price, isAsset, note } = body;

    if (!id || !name || !categoryId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const item = await (prisma as any).hrSupplyItem.update({
      where: { id },
      data: {
        name,
        code: code || null,
        categoryId,
        unit: unit || "cái",
        minStock: isNaN(Number(minStock)) ? 0 : Number(minStock),
        currentStock: isNaN(Number(currentStock)) ? 0 : Number(currentStock),
        price: isNaN(Number(price)) ? 0 : Number(price),
        isAsset: !!isAsset,
        note: note || ""
      },
      include: {
        category: true
      }
    });

    return NextResponse.json(item);
  } catch (error: any) {
    console.error("[STATIONERY_ITEMS_PUT_ERROR]", error);
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Missing ID", { status: 400 });
    }

    await (prisma as any).hrSupplyItem.update({
      where: { id },
      data: { isActive: false }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("[STATIONERY_ITEMS_DELETE_ERROR]", error);
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}
