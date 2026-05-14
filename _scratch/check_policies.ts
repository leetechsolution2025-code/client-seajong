import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const policies = await (prisma as any).laborPolicy.findMany();
  console.log(JSON.stringify(policies, null, 2));
}

main().catch(console.error);
