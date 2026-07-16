const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const inv = await prisma.inventoryItem.findMany({
    where: {
      tenHang: { contains: "Van" }
    },
    include: { stocks: true }
  })
  console.log(JSON.stringify(inv, null, 2))
}
main()
