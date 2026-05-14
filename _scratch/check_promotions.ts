import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const count = await (prisma as any).promotionRequest.count()
  console.log('PromotionRequest count:', count)
  
  if (count > 0) {
    const data = await (prisma as any).promotionRequest.findMany({
      include: {
        employee: true
      }
    })
    console.log('PromotionRequest data:', JSON.stringify(data, null, 2))
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
