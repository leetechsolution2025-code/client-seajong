const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const keywords = ["ray bi", "chốt u", "băng dính"];
  const mats = await prisma.materialItem.findMany();
  const toDelete = mats.filter(m => keywords.some(k => m.name.toLowerCase().includes(k)));
  for (const m of toDelete) {
    await prisma.materialItem.delete({ where: { id: m.id } }).catch(e => {});
  }
}
main().finally(() => prisma.$disconnect());
