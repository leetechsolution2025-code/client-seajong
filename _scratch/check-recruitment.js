const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const requests = await prisma.recruitmentRequest.findMany({
    include: { candidates: true }
  });
  console.log(JSON.stringify(requests, null, 2));
}

main().catch(console.error);
