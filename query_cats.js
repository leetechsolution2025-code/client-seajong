const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const cats = await prisma.seajongCategory.findMany()
  console.log(cats.map(c => c.name).join(", "))
}
main()
