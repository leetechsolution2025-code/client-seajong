import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const id = 'cmovtn777000ggnz3od6moe9m'
  const inInv = await prisma.inventoryCategory.findUnique({ where: { id } })
  const inCat = await prisma.category.findUnique({ where: { id } })
  
  console.log('ID:', id)
  console.log('In InventoryCategory:', inInv ? 'YES' : 'NO')
  console.log('In Category:', inCat ? 'YES' : 'NO')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
