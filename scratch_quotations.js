const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const quotations = await prisma.quotation.findMany({
    select: { id: true, code: true, type: true, thanhTien: true, trangThai: true, createdAt: true },
  });
  console.log("Total quotations:", quotations.length);
  console.log(quotations);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
