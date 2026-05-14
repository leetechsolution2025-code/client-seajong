import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const branch = await (prisma as any).branch.findFirst({
    where: { code: "lv-20260413-4197-jpme" },
    include: { subnets: true }
  });
  console.log("TARGET BRANCH:", JSON.stringify(branch, null, 2));
  await prisma.$disconnect();
}

main();
