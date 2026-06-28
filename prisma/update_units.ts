import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== UPDATING EXISTING UNITS IN DATABASE ===");

  const items = await prisma.inventoryItem.updateMany({
    where: { donVi: "Cái" },
    data: { donVi: "cái" }
  });
  console.log(`Updated ${items.count} InventoryItems to 'cái'`);

  const materials = await (prisma as any).materialItem.updateMany({
    where: { unit: "Cái" },
    data: { unit: "cái" }
  });
  console.log(`Updated ${materials.count} MaterialItems to 'cái'`);

  console.log("=== COMPLETED UNITS UPDATE ===");
}

main().catch(console.error).finally(() => prisma.$disconnect());
