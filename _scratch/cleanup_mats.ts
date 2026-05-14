import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const allMats = await prisma.materialItem.findMany()
  console.log('Total MaterialItem count before:', allMats.length)
  
  const toDelete = allMats.filter(m => !m.name.includes('Thân tròn'))
  const toKeep = allMats.filter(m => m.name.includes('Thân tròn'))
  
  console.log('To keep:', toKeep.map(m => m.name))
  console.log('To delete:', toDelete.map(m => m.name))
  
  for (const m of toDelete) {
    // Delete related stocks first if any
    await prisma.materialStock.deleteMany({ where: { materialId: m.id } })
    await prisma.materialItem.delete({ where: { id: m.id } })
  }
  
  const finalCount = await prisma.materialItem.count()
  console.log('Total MaterialItem count after:', finalCount)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
