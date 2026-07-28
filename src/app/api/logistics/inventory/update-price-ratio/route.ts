import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { ratio } = await req.json();
    const numRatio = parseFloat(ratio);
    if (isNaN(numRatio) || numRatio <= 0) {
      return NextResponse.json({ error: "Tỷ lệ không hợp lệ" }, { status: 400 });
    }

    // Fetch all materials with price > 0
    const materials = await prisma.inventoryItem.findMany({
      where: { giaNhap: { gt: 0 } },
      select: { id: true, giaNhap: true }
    });

    if (materials.length > 0) {
      // Chunk updates into transactions to avoid SQLite limits
      const chunkSize = 100;
      for (let i = 0; i < materials.length; i += chunkSize) {
        const chunk = materials.slice(i, i + chunkSize);
        const updates = chunk.map((m: any) => 
          prisma.inventoryItem.update({
            where: { id: m.id },
            data: { giaBan: m.price * (1 + numRatio / 100) }
          })
        );
        await prisma.$transaction(updates);
      }
    }

    return NextResponse.json({ success: true, updated: materials.length });
  } catch (err: any) {
    console.error("[update-price-ratio]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
