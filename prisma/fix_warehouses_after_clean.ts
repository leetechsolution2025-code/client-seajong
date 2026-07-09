import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const khoChinh = await prisma.warehouse.findUnique({ where: { code: "KHO-CHINH" } });
  const khoThanhPham = await prisma.warehouse.findUnique({ where: { code: "KHO-THANHPHAM" } });
  const kvp = await prisma.warehouse.findUnique({ where: { code: "KVP" } });

  console.log("KHO-CHINH:", khoChinh);
  console.log("KHO-THANHPHAM:", khoThanhPham);
  
  if (khoChinh && khoThanhPham) {
    // 1. Move Synced Products back to KHO-CHINH
    const prodStocks = await prisma.inventoryStock.findMany({
      where: {
        warehouseId: khoThanhPham.id,
        inventoryItem: { webProductId: { not: null } }
      }
    });

    console.log(`Found ${prodStocks.length} synced web products in KHO-THANHPHAM. Moving them to KHO-CHINH...`);
    let movedProducts = 0;
    for (const stock of prodStocks) {
      // check if it already exists in KHO-CHINH
      const existing = await prisma.inventoryStock.findUnique({
        where: { inventoryItemId_warehouseId: { inventoryItemId: stock.inventoryItemId, warehouseId: khoChinh.id } }
      });
      if (existing) {
        await prisma.inventoryStock.update({
          where: { id: existing.id },
          data: { soLuong: existing.soLuong + stock.soLuong }
        });
        await prisma.inventoryStock.delete({ where: { id: stock.id } });
      } else {
        await prisma.inventoryStock.update({
          where: { id: stock.id },
          data: { warehouseId: khoChinh.id }
        });
      }
      movedProducts++;
    }
    console.log(`Moved ${movedProducts} products successfully.`);
    
    // 2. Fix KHO-CHINH type if wrong
    if (khoChinh.type !== "PRODUCT") {
       await prisma.warehouse.update({
         where: { id: khoChinh.id },
         data: { type: "PRODUCT" }
       });
       console.log("Updated KHO-CHINH type to PRODUCT.");
    }
    
    // 3. Move Materials from KHO-CHINH to KVP
    if (kvp) {
       const matStocks = (await prisma.materialStock.findMany({
         where: { warehouseId: khoChinh.id }
       })) as any[];
       console.log(`Found ${matStocks.length} materials in KHO-CHINH. Moving to KVP...`);
       
       let movedMats = 0;
       for (const stock of matStocks) {
         const existing = await prisma.materialStock.findUnique({
           where: { materialId_warehouseId: { materialId: stock.materialId, warehouseId: kvp.id } }
         });
         if (existing) {
           await prisma.materialStock.update({
             where: { id: existing.id },
             data: { soLuong: existing.soLuong + stock.soLuong }
           });
           await prisma.materialStock.delete({ where: { id: stock.id } });
         } else {
           await prisma.materialStock.update({
             where: { id: stock.id },
             data: { warehouseId: kvp.id }
           });
         }
         movedMats++;
       }
       console.log(`Moved ${movedMats} materials to KVP.`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
