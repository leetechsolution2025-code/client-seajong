const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const products = await prisma.seajongProduct.findMany({
    where: { name: { contains: "Van" } },
    include: { categories: true }
  })
  console.log(JSON.stringify(products.map(p => ({ name: p.name, cats: p.categories.map(c => c.name) })), null, 2))
}
main()
