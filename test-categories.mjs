import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const types = await prisma.categoryTypeDef.findMany();
  console.log("Types:", types.map(t => t.value));
  const categories = await prisma.category.findMany();
  console.log("Found categories:", Array.from(new Set(categories.map(c => c.type))));
}
run();
