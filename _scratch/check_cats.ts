import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const invCats = await prisma.inventoryCategory.findMany()
  console.log('InventoryCategory records:', invCats.length)
  if (invCats.length > 0) {
    console.log('Sample InventoryCategory:', JSON.stringify(invCats[0], null, 2))
  }
  
  const vtsxCats = await prisma.category.findMany({ where: { type: 'vat_tu_san_xuat' } })
  console.log('Category (vat_tu_san_xuat) records:', vtsxCats.length)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
