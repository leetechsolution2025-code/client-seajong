const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const items = await prisma.inventoryItem.findMany({
    where: { tenHang: { in: ['Thân vòi Rumine đồng loại 1', 'Lõi đồng đơn', 'Gioang đệm chân vòi lạnh tường'] } },
    select: { tenHang: true, giaNhap: true }
  });
  console.log(items);
}
main();
