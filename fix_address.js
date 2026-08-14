const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const defect = await prisma.defectRecord.findUnique({
    where: { code: 'ERR-20260814-01' }
  });
  
  if (defect && defect.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: defect.customerId }
    });
    
    if (customer && customer.address) {
      await prisma.defectRecord.update({
        where: { id: defect.id },
        data: { customerAddress: customer.address }
      });
      console.log("Updated address to:", customer.address);
    } else {
      console.log("Customer doesn't have an address or not found.");
      // If no address, just put a dummy one for testing so user sees it
      await prisma.defectRecord.update({
        where: { id: defect.id },
        data: { customerAddress: '123 Đường ABC, Quận XYZ' }
      });
      console.log("Updated address to dummy.");
    }
  }
}
main().finally(() => prisma.$disconnect());
