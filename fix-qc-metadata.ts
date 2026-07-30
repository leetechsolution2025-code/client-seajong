import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.saleOrder.findUnique({ 
    where: { code: "DBH-20260730-01" },
    include: { saleOrderItems: true }
  });
  if (!order) return;

  const metadata = JSON.stringify({
    productionOrder: order.code,
    bomCode: "BOM-" + (order.code || "").replace("DBH-", ""),
    model: (order.saleOrderItems || []).map((i: any) => i.tenHang).join(", "),
    totalQuantity: (order.saleOrderItems || []).reduce((acc: number, i: any) => acc + i.soLuong, 0),
    batch: "LOT-" + new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    assemblyTeam: "Tổ lắp ráp - Ca ngày"
  });

  await prisma.qualityInspection.updateMany({
    where: { notes: { contains: "DBH-20260730-01" } },
    data: { metadata }
  });

  console.log("Updated metadata for DBH-20260730-01");
}
main();
