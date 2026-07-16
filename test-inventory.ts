import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const where: any = {};
  where.stocks = { some: { warehouseId: 'cmoip699s0000i4almoh1zuqs' } };
  
  const rawItems = await prisma.inventoryItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      skip: 0,
      include: {
        category: { select: { name: true } },
        dinhMuc: { select: { id: true, code: true } },
        stocks: { where: { warehouseId: 'cmoip699s0000i4almoh1zuqs' }, select: { soLuong: true, soLuongMin: true } },
      },
  });
  console.log("Found:", rawItems.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
