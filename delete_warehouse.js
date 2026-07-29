const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    await prisma.warehouse.deleteMany({
      where: {
        code: "KHO-THANHPHAM"
      }
    });
    console.log("Deleted KHO-THANHPHAM");
}

main().catch(console.error).finally(() => prisma.$disconnect());
