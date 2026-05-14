
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkConfirmations() {
  const month = 5;
  const year = 2026;

  console.log(`Checking confirmations for ${month}/${year}...`);

  const confirmations = await (prisma as any).attendanceConfirmation.findMany({
    where: {
      month,
      year
    },
    include: {
      employee: {
        select: {
          fullName: true,
          code: true
        }
      }
    }
  });

  if (confirmations.length === 0) {
    console.log("No confirmations found for May 2026.");
  } else {
    console.log(`Found ${confirmations.length} confirmations:`);
    confirmations.forEach((c: any) => {
      console.log(`- ${c.employee.fullName} (${c.employee.code}) confirmed at: ${c.confirmedAt}`);
    });
  }
}

checkConfirmations()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
