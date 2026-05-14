import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.inventoryCategory.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, parentId, code } = body;

    if (!name) return NextResponse.json({ error: "Thiếu tên danh mục" }, { status: 400 });

    const newCategory = await prisma.inventoryCategory.create({
      data: { name, parentId, code } as any,
    });

    return NextResponse.json(newCategory);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
