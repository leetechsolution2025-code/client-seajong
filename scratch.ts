import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const stocks = await prisma.inventoryStock.findMany({
    where: { inventoryItemId: "cms5ocb64007s8oz3468tt779" }, // BỒN CẦU
    orderBy: { soLuong: 'desc' }
  })
  console.log(stocks)
}
main()
