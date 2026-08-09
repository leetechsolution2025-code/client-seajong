import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const items = await prisma.inventoryItem.findMany({
    where: { tenHang: { contains: "BỒN CẦU LIỀN KHỐI SEAJONG SJ-BC0141B" } },
    include: { stocks: { include: { warehouse: true } } }
  })
  
  console.log(JSON.stringify(items, null, 2))
}
main()
