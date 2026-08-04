import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const cats = await prisma.category.findMany({ where: { name: 'Kim cương' } })
  console.log(cats)
}
main()
