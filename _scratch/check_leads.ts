import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const insights = await prisma.marketingInsight.findMany();
  let total = 0;
  let may = 0;
  for (const i of insights) {
    total += i.leads;
    if (i.date.toISOString().includes("-05-")) {
      may += i.leads;
    }
    console.log(i.date.toISOString(), i.leads);
  }
  console.log({ total, may });
}
run();
