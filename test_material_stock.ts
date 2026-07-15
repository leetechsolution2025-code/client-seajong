import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.materialStock.findFirst();
  console.log("MaterialStock:", c);
  const count = await prisma.materialStock.count();
  console.log("Total MaterialStock:", count);
}

main().finally(() => prisma.$disconnect());
