import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  try {
    const wrongWarehouse = await prisma.warehouse.findUnique({
      where: { code: "KHO-HANGHOA" }
    });
    
    if (wrongWarehouse) {
      // Find InventoryItems related to this warehouse
      const count = await prisma.inventoryItem.count({
        where: { warehouseId: wrongWarehouse.id }
      });
      
      if (count > 0) {
        // Move items to KHO-CHINH
        const mainWarehouse = await prisma.warehouse.findUnique({
          where: { code: "KHO-CHINH" }
        });
        if (mainWarehouse) {
           await prisma.inventoryItem.updateMany({
             where: { warehouseId: wrongWarehouse.id },
             data: { warehouseId: mainWarehouse.id }
           });
           console.log(`Moved ${count} items from KHO-HANGHOA to KHO-CHINH`);
        }
      }
      
      await prisma.warehouse.delete({
        where: { code: "KHO-HANGHOA" }
      });
      console.log("Deleted wrong warehouse KHO-HANGHOA");
    } else {
      console.log("No wrong KHO-HANGHOA warehouse found");
    }
  } catch (error) {
    console.error("Error cleaning up warehouse:", error);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
