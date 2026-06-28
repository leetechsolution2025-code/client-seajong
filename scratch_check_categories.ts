import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany({
    where: {
      type: "position"
    }
  });

  console.log(`Found ${categories.length} position categories:`);
  categories.forEach((c: any) => {
    console.log(`- Code: ${c.code}, Name: ${c.name}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
