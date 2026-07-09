import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  try {
    const wrongWarehouse1 = await prisma.warehouse.findUnique({
      where: { code: "KHO-HANGHOA" }
    });
    
    if (wrongWarehouse1) {
      await prisma.warehouse.delete({
        where: { code: "KHO-HANGHOA" }
      });
      console.log("Deleted wrong warehouse KHO-HANGHOA");
    } else {
      console.log("No wrong KHO-HANGHOA warehouse found");
    }

    const wrongWarehouse2 = await prisma.warehouse.findUnique({
      where: { code: "KHO-PHUKIEN" }
    });
    
    if (wrongWarehouse2) {
      await prisma.warehouse.delete({
        where: { code: "KHO-PHUKIEN" }
      });
      console.log("Deleted wrong warehouse KHO-PHUKIEN");
    } else {
      console.log("No wrong KHO-PHUKIEN warehouse found");
    }

  } catch (error) {
    console.error("Error cleaning up warehouse:", error);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
