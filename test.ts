import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const customers = await prisma.customer.findMany({ select: { id: true, name: true, nguon: true }, take: 10 })
  console.log(customers)
}
main()
