import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const debts = await prisma.debt.findMany({
    where: {
      partnerName: {
        contains: 'Anh Quân'
      }
    }
  })
  console.log(debts)
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
