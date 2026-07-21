import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const deletedVatTu = await prisma.dinhMucVatTu.deleteMany({});
    const deletedDinhMuc = await prisma.dinhMuc.deleteMany({});
    
    console.log(`Deleted ${deletedVatTu.count} DinhMucVatTu records.`);
    console.log(`Deleted ${deletedDinhMuc.count} DinhMuc records.`);
  } catch (error) {
    console.error("Error deleting BOM data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
