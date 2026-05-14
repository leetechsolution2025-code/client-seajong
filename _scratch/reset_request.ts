
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.promotionRequest.updateMany({
    where: { employee: { fullName: "Nguyễn Lan Nhi" } },
    data: {
      status: "RECEIVING",
      hrApproved: false,
      directorApproved: false,
      interviewResult: null,
      interviewDate: null,
      interviewerId: null
    }
  });
  console.log(`Updated ${result.count} requests.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
