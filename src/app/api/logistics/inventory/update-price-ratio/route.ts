import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { ratio, marginPct, marginType = "cost", scope = "all" } = await req.json();
    const numRatio = parseFloat(ratio || marginPct);
    if (isNaN(numRatio) || numRatio <= 0) {
      return NextResponse.json({ error: "Tỷ lệ không hợp lệ" }, { status: 400 });
    }
    if (marginType === "revenue" && numRatio >= 100) {
      return NextResponse.json({ error: "Lợi nhuận trên doanh thu phải < 100%" }, { status: 400 });
    }

    let whereClause: any = { giaNhap: { gt: 0 } };
    if (scope === "bom") {
      // Trước khi tính toán BOM, cập nhật lại toàn bộ giaNhap (giá vốn) cho các BOM
      await prisma.$executeRaw`
        UPDATE InventoryItem
        SET giaNhap = COALESCE((
          SELECT SUM(dv.soLuong * i.giaNhap)
          FROM DinhMucVatTu dv
          JOIN InventoryItem i ON dv.inventoryItemId = i.id
          JOIN DinhMuc dm ON dv.dinhMucId = dm.id
          WHERE dm.inventoryItemId = InventoryItem.id
        ), 0)
        WHERE id IN (SELECT inventoryItemId FROM DinhMuc WHERE inventoryItemId IS NOT NULL)
      `;
      whereClause = {}; // We update all BOMs, even if cost is 0
      whereClause.dinhMucs = { some: {} }; // Only items that have a BOM
    } else if (scope === "material") {
      whereClause.dinhMucs = { none: {} }; // Only items without a BOM
    }

    // Fetch all materials with price > 0 matching the scope
    const materials = await prisma.inventoryItem.findMany({
      where: whereClause,
      select: { id: true, giaNhap: true }
    });

    if (materials.length > 0) {
      // Chunk updates into transactions to avoid SQLite limits
      const chunkSize = 100;
      for (let i = 0; i < materials.length; i += chunkSize) {
        const chunk = materials.slice(i, i + chunkSize);
        const updates = chunk.map((m: any) => {
          let newPrice = m.giaNhap * (1 + numRatio / 100);
          if (marginType === "revenue") {
             newPrice = m.giaNhap / (1 - numRatio / 100);
          }
          return prisma.inventoryItem.update({
            where: { id: m.id },
            data: { 
              giaBan: Math.round(newPrice),
              loiNhuanKyVong: numRatio,
              phuongPhapTinhLoiNhuan: marginType === "revenue" ? "revenue" : "cost"
            }
          });
        });
        await prisma.$transaction(updates);
      }
      
      // Also sync DinhMuc.giaBan to match the new InventoryItem.giaBan
      await prisma.$executeRaw`
        UPDATE DinhMuc
        SET giaBan = (
          SELECT giaBan FROM InventoryItem WHERE InventoryItem.id = DinhMuc.inventoryItemId
        )
        WHERE inventoryItemId IS NOT NULL
      `;
    }

    return NextResponse.json({ success: true, updatedCount: materials.length });
  } catch (err: any) {
    console.error("[update-price-ratio]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
