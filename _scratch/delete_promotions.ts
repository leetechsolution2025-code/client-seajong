import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const count = await (prisma as any).promotionRequest.count();
  console.log(`Found ${count} promotion requests to delete.`);
  
  if (count > 0) {
    const res = await (prisma as any).promotionRequest.deleteMany({});
    console.log(`Deleted ${res.count} promotion requests successfully.`);
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
