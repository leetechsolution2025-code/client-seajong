import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const types = await prisma.categoryTypeDef.findMany()
  console.log('Category Types:', JSON.stringify(types, null, 2))
  
  const invCategories = await prisma.inventoryCategory.findMany({
    where: { isActive: true },
    select: { name: true, code: true, parentId: true }
  })
  console.log('Inventory Categories count:', invCategories.length)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
