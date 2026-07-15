import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const bom = await prisma.dinhMuc.findFirst({
    include: { vatTu: { include: { material: true } } }
  });
  console.log(JSON.stringify(bom, null, 2));
}

main().finally(() => prisma.$disconnect());
