const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("--- Category Types ---");
  const types = await prisma.categoryTypeDef.findMany();
  console.log(JSON.stringify(types, null, 2));

  console.log("\n--- Categories ---");
  const categories = await prisma.category.findMany();
  console.log(JSON.stringify(categories, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
