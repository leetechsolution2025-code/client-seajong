import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");

    if (!categoryId) {
      return new NextResponse("Missing categoryId", { status: 400 });
    }

    // 1. Lấy thông tin Category (để lấy mã nhóm)
    const category = await (prisma as any).hrSupplyCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return new NextResponse("Category not found", { status: 404 });
    }

    // 2. Tìm các item trong nhóm này để lấy số thứ tự lớn nhất
    const lastItem = await (prisma as any).hrSupplyItem.findFirst({
      where: { categoryId },
      orderBy: { createdAt: 'desc' }
    });

    let nextNum = 1;
    if (lastItem && lastItem.code && lastItem.code.includes("-")) {
      const parts = lastItem.code.split("-");
      const lastNum = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }

    // 3. Tạo mã mới dạng XXX-001
    const stt = nextNum.toString().padStart(3, "0");
    const nextCode = `${category.code}-${stt}`;

    return NextResponse.json({ nextCode });
  } catch (error) {
    console.error("[STATIONERY_NEXT_CODE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
