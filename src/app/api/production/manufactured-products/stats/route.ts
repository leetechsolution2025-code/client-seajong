import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const categoryId  = searchParams.get("categoryId")  ?? "";

    const where: any = {};
    if (categoryId) where.productCategoryId = categoryId;

    const total = await prisma.manufacturedProduct.count({ where });
    
    // Stub
    return NextResponse.json({
      tongMatHang: total,
      tongGiaTri: 0,
      hetHang: 0,
      sapHet: 0,
      categoryStats: []
    });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi Server" }, { status: 500 });
  }
}
