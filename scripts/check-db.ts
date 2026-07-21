import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const rawItems = await prisma.manufacturedProduct.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    skip: 0,
    include: {
      productCategory: { select: { name: true } },
      dinhMucs: { select: { id: true, code: true, tenDinhMuc: true } }
    }
  });
  console.log("Found:", rawItems.length);
  
  if (rawItems.length > 0) {
    console.log(rawItems[0]);
  }
}
main();
