import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const total = await prisma.seajongProduct.count();
  return NextResponse.json({
    tongMatHang: total,
    tongGiaTri: 0,
    hetHang: 0,
    sapHet: 0,
    categoryStats: []
  });
}
