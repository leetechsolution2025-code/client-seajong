import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const paginated = await prisma.manufacturedProduct.findMany({
    take: 50,
  });
  
  const mappedItems = await Promise.all(paginated.map(async (item: any) => {
    let soLuong = 0;
    let trangThai = "het-hang";
    if (item.code) {
      const invItem = await prisma.inventoryItem.findUnique({
        where: { code: item.code },
        include: { stocks: { select: { soLuong: true } } }
      });
      if (invItem && invItem.stocks) {
        soLuong = invItem.stocks.reduce((sum: number, s: any) => sum + s.soLuong, 0);
        trangThai = soLuong > 0 ? "con-hang" : "het-hang";
      }
    }

    return {
      ...item,
      soLuong,
      trangThai
    };
  }));

  console.log("Mapped:", mappedItems.length);
  if (mappedItems.length > 0) console.log(mappedItems[0]);
}
main();
