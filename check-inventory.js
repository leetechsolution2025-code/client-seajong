const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const items = await prisma.inventoryItem.findMany({
    where: { tenHang: { contains: 'Rumine' } },
    select: { tenHang: true, giaNhap: true }
  });
  console.log("Inventory:", items);
  
  const mats = await prisma.materialItem.findMany({
    where: { name: { contains: 'Rumine' } },
    select: { name: true, price: true }
  });
  console.log("Materials:", mats);
}
main();
