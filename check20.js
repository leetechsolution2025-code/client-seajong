const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.manufacturedProduct.findFirst({
    where: { name: 'Vòi rumine đồng loại 1' },
    include: { dinhMucs: { include: { vatTu: { include: { material: true } } } } }
  });
  console.log(JSON.stringify(p, null, 2));
}
main();
