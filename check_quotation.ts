import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const item = await prisma.inventoryItem.findFirst({
    where: { code: 'CSC01S' },
    include: { stocks: true }
  });
  if (!item) return;
  
  const qis = await prisma.quotationItem.findMany({
    where: { tenHang: { contains: 'CSC01S' } }, // Assuming tenHang contains code or we can match by something else
    include: { quotation: true }
  });
  console.log("Quotations:", qis.map((q: any) => ({ q: q.quotation?.soBaoGia, qty: q.soLuong, status: q.quotation?.trangThai })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
