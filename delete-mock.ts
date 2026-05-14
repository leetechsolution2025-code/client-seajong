import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  await prisma.marketingYearlyPlan.deleteMany({});
  console.log("Đã oanh tạc sạch sẽ db rác!");
}
main()
