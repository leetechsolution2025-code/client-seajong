import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await (prisma as any).hrSupplyCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("[STATIONERY_CATEGORIES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, code } = body;

    const category = await (prisma as any).hrSupplyCategory.create({
      data: { name, code, isActive: true }
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("[STATIONERY_CATEGORIES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
