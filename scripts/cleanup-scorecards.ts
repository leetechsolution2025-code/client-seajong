
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up interview scorecards...");

  const deleted = await prisma.interviewScorecard.deleteMany({});
  console.log(`Deleted ${deleted.count} interview scorecards.`);

  console.log("Cleanup complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
