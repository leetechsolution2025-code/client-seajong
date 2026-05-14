
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.recruitmentRequest.count();
  console.log(`RecruitmentRequest count: ${count}`);
  const requests = await prisma.recruitmentRequest.findMany({
    select: { id: true, position: true, status: true }
  });
  console.log(JSON.stringify(requests, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
