const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tickets = await prisma.logisticsTicket.findMany({
      where: {
        type: "BATCH_PACKING",
      },
      include: {
        saleOrder: { select: { code: true, ngayGiao: true } }
      }
    });
    console.log(JSON.stringify(tickets, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
