const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const mvs = await prisma.stockMovement.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      inventoryItem: true,
      toWarehouse: true,
      fromWarehouse: true
    }
  });
  console.log("=== STOCK MOVEMENTS ===");
  mvs.forEach(m => {
    console.log(`${m.createdAt.toISOString()}: ${m.type.toUpperCase()} ${m.soLuong} ${m.inventoryItem.tenHang} to ${m.toWarehouse?.name || 'N/A'} (soChungTu: ${m.soChungTu || 'N/A'}, lyDo: ${m.lyDo || 'N/A'})`);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
