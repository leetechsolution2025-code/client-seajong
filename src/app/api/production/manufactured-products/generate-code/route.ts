import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const categoryId = req.nextUrl.searchParams.get("categoryId");
    if (!categoryId) return NextResponse.json({ code: "" });

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) return NextResponse.json({ code: "" });

    // @ts-ignore
    const count = await prisma.manufacturedProduct.count({ where: { categoryId } });
    const stt = String(count + 1).padStart(3, '0');
    const timestamp = Date.now().toString().slice(-4);
    
    let prefix = category.code ? category.code.toUpperCase() : "SP";
    // If it's an auto-generated code like nsp-20260706-..., use the acronym of the name instead
    if (prefix.length > 10 && prefix.includes('-')) {
       prefix = category.name.split(' ').map(w => w[0]).join('').toUpperCase();
       prefix = prefix.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/Đ/g, "D");
    }

    const generatedCode = `${prefix}-${timestamp}-${stt}`;
    return NextResponse.json({ code: generatedCode });
  } catch (e) {
    console.error("[GET /api/production/manufactured-products/generate-code]", e);
    return NextResponse.json({ code: "" }, { status: 500 });
  }
}
