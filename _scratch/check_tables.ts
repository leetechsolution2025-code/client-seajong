import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const invCount = await prisma.inventoryItem.count()
  const matCount = await prisma.materialItem.count()
  
  console.log('InventoryItem count:', invCount)
  console.log('MaterialItem count:', matCount)
  
  const lastMat = await prisma.materialItem.findFirst({ orderBy: { createdAt: 'desc' } })
  console.log('Last Material:', JSON.stringify(lastMat, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
