const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function wipeAll() {
  console.log("Starting wipe...");
  try {
    // Delete dependent tables first
    const ops = [
      prisma.dinhMucVatTu.deleteMany(),
      prisma.dinhMuc.deleteMany(),
      prisma.qualityInspection.deleteMany(),
      prisma.saleOrderItem.deleteMany(),
      prisma.retailInvoiceItem.deleteMany(),
      prisma.purchaseRequestItem.deleteMany(),
      prisma.purchaseOrderItem.deleteMany(),
      prisma.stockMovement.deleteMany(),
      prisma.inventoryStock.deleteMany(),
      prisma.seajongProduct.deleteMany(), // In case they are linked
    ];
    
    console.log("Executing transaction...");
    await prisma.$transaction(ops);
    console.log("Deleted dependent tables.");

    const invResult = await prisma.inventoryItem.deleteMany();
    console.log("Deleted " + invResult.count + " InventoryItems.");
    
    // Also delete MaterialItem and ManufacturedProduct if any still exist
    if (prisma.materialItem) {
      await prisma.materialItem.deleteMany().catch(e => console.log("No MaterialItem table"));
    }
    if (prisma.manufacturedProduct) {
      await prisma.manufacturedProduct.deleteMany().catch(e => console.log("No ManufacturedProduct table"));
    }

  } catch (error) {
    console.error("Error during wipe:", error);
  } finally {
    await prisma.$disconnect();
  }
}

wipeAll();
