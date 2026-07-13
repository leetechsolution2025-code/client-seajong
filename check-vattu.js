const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const items = await prisma.vatTu.findMany({
    where: { tenVatTu: { in: ['Thân vòi Rumine đồng loại 1', 'Lõi đồng đơn', 'Gioang đệm chân vòi lạnh tường'] } },
    select: { tenVatTu: true, donGia: true, materialId: true }
  });
  console.log(items);
}
main();
