import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.manufacturedProduct.findFirst({
  where: { name: { contains: "rumine" } },
  include: { dinhMucs: true }
}).then(res => {
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
})
