const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const items = await prisma.saleOrderItem.findMany()
  console.log(items.map(i => ({ tenHang: i.tenHang, thanhTien: i.thanhTien })))
}

main().then(() => prisma.$disconnect())
