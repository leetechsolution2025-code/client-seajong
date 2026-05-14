
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Fixing candidate statuses...");

  const result = await prisma.candidate.updateMany({
    where: {
      status: "Interviewed"
    },
    data: {
      status: "Interviewing"
    }
  });

  console.log(`Updated ${result.count} candidates from 'Interviewed' to 'Interviewing'.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
