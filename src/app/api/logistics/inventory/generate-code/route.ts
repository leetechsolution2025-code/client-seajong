import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    if (!categoryId) return NextResponse.json({ code: "SP-" + Date.now().toString().slice(-6) });

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) return NextResponse.json({ code: "SP-" + Date.now().toString().slice(-6) });

    const count = await prisma.inventoryItem.count({ where: { categoryId, loai: 'thanh-pham' } });
    const nextCode = `${category.code}-${String(count + 1).padStart(3, '0')}`;
    return NextResponse.json({ code: nextCode });
  } catch (error) {
    return NextResponse.json({ code: "SP-" + Date.now().toString().slice(-6) });
  }
}
