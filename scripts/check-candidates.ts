
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const candidates = await prisma.candidate.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      interviewParticipants: true
    }
  });

  console.log("Candidates:");
  candidates.forEach(c => {
    console.log(`- ${c.name} (${c.id}): ${c.status}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
