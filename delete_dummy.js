const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    await prisma.logisticsTicket.deleteMany({
      where: {
        saleOrderId: null
      }
    });
    console.log("Deleted dummy tickets");
}

main().catch(console.error).finally(() => prisma.$disconnect());
