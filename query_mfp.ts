import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const mfps = await prisma.manufacturedProduct.findMany({
    where: {
      name: {
        contains: 'Sen'
      }
    }
  });
  console.log("MFPs:", mfps);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
