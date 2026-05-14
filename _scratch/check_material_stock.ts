import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const warehouseId = 'cmoit7ttx0000i4514gkqzm1k' // Kho vật tư & phụ kiện
  
  const matStocks = await prisma.materialStock.findMany({
    where: { warehouseId },
    include: { material: true }
  })
  
  console.log('MaterialStock records in this warehouse:', matStocks.length)
  if (matStocks.length > 0) {
    console.log('Sample Stock:', JSON.stringify(matStocks[0], null, 2))
  }
  
  const allMats = await prisma.materialItem.findMany()
  console.log('Total MaterialItem count:', allMats.length)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
