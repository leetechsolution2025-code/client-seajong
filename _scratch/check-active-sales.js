const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sos = await prisma.saleOrder.findMany({
    select: {
      id: true, code: true, trangThai: true, keToanDuyet: true
    }
  });
  console.log("=== SALE ORDERS IN DB ===");
  sos.forEach(s => {
    console.log(`id=${s.id}, code=${s.code}, trangThai=${s.trangThai}, keToanDuyet=${s.keToanDuyet}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
