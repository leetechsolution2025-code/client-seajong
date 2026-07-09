const { PrismaClient } = require('@prisma/client');
const prismaMaster = new PrismaClient();
const childDbUrl = `file:/Users/leanhvan/client-seajong/prisma/dev.db`;
const prismaChild = new PrismaClient({ datasources: { db: { url: childDbUrl } } });

async function clean(prisma) {
  const keywords = ["ván", "nẹp", "chỉ", "ốc chó", "veneer", "nhôm tổ ong", "bề mặt ev"];
  
  const mats = await prisma.materialItem.findMany();
  const toDeleteMats = mats.filter(m => keywords.some(k => m.name.toLowerCase().includes(k)));
  
  console.log(`Deleting ${toDeleteMats.length} material items...`);
  for (const m of toDeleteMats) {
    await prisma.materialItem.delete({ where: { id: m.id } }).catch(e => {});
  }
}

async function main() {
  await clean(prismaMaster);
  await clean(prismaChild);
  console.log("Done");
}

main().finally(() => { prismaMaster.$disconnect(); prismaChild.$disconnect(); });
