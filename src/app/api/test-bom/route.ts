import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export async function GET() {
  const rows = await prisma.$queryRaw`
      SELECT 
        dm.id          AS dm_id,
        dm.code        AS dm_code,
        dm.tenDinhMuc  AS dm_tenDinhMuc,
        dv.id          AS dv_id,
        dv.inventoryItemId  AS dv_inventoryItemId,
        dv.maVatTu     AS dv_maVatTu,
        dv.tenVatTu    AS dv_tenVatTu,
        dv.soLuong     AS dv_soLuong,
        mi.id          AS mi_id,
        mi.tenHang        AS mi_name,
        mi.giaNhap       AS mi_price
      FROM DinhMuc dm
      LEFT JOIN DinhMucVatTu dv ON dv.dinhMucId = dm.id
      LEFT JOIN InventoryItem mi ON mi.id = dv.inventoryItemId
      WHERE dm.code LIKE '%03S%'
      LIMIT 10
  `;
  return NextResponse.json(rows);
}
