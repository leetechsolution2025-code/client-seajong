import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const item = await prisma.qualityInspection.findFirst({ where: { code: "QC-20260730-482" } });
  console.log(item?.notes);
}
main();
