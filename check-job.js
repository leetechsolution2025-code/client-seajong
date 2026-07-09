const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const jobs = await prisma.jobPositionCategory.findMany();
  console.log("Jobs:", jobs);
}
main();
