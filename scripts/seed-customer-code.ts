import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany({
    where: { code: null },
    orderBy: { createdAt: "asc" }
  });

  console.log(`Found ${customers.length} customers without code.`);

  let index = 1;
  for (const customer of customers) {
    let codeStr = `KH${String(index).padStart(4, "0")}`;
    
    // Check if code exists to avoid unique constraint error
    let exists = await prisma.customer.findUnique({ where: { code: codeStr } });
    while(exists) {
      index++;
      codeStr = `KH${String(index).padStart(4, "0")}`;
      exists = await prisma.customer.findUnique({ where: { code: codeStr } });
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { code: codeStr }
    });
    console.log(`Updated customer ${customer.name} with code ${codeStr}`);
    index++;
  }

  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
