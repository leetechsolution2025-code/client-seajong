const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const subnets = await prisma.branchSubnet.findMany();
  console.log(JSON.stringify(subnets, null, 2));
}

main();
