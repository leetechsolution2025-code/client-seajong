const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const inv = await prisma.inventoryItem.findMany({
    where: { tenHang: { contains: "Van" } },
    take: 2
  })
  console.log("Inventory:", inv.length)
  
  const mat = await prisma.materialItem.findMany({
    where: { name: { contains: "Van" } },
    take: 2
  })
  console.log("Material:", mat.length)
}
main()
