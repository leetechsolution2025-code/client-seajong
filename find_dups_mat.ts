import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const m = await (prisma as any).materialItem.findMany();
  const found = m.filter((x: any) => x.name.toLowerCase().includes("35s"));
  found.forEach((f: any) => console.log(`[MAT] [${f.code}] ${f.name}`));
}
main().finally(() => prisma.$disconnect());
