
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const reqs = await prisma.promotionRequest.findMany({
    include: { employee: true }
  });
  console.log(JSON.stringify(reqs.map(r => ({
    id: r.id,
    name: r.employee.fullName,
    status: r.status,
    hrApproved: r.hrApproved
  })), null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
