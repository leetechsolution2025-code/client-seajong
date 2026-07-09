const { PrismaClient } = require('@prisma/client');
const path = require('path');
const childDbUrl = `file:/Users/leanhvan/client-seajong/prisma/dev.db`;
process.env.DATABASE_URL = childDbUrl;

const prisma = new PrismaClient({
  datasources: { db: { url: childDbUrl } }
});

async function main() {
  const keywords = ["gỗ", "thép", "xi măng", "cát", "gạch", "sơn pu", "ván mdf", "nhám", "bản lề", "ray trượt", "tay nắm", "keo sữa", "lưỡi cưa", "picomat", "plywood", "melamine"];
  
  const mats = await prisma.materialItem.findMany();
  const toDeleteMats = mats.filter(m => keywords.some(k => m.name.toLowerCase().includes(k)));
  
  for (const m of toDeleteMats) {
    await prisma.materialItem.delete({ where: { id: m.id } }).catch(e => {});
  }
  
  const invs = await prisma.inventoryItem.findMany();
  const toDeleteInvs = invs.filter(m => keywords.some(k => m.tenHang.toLowerCase().includes(k)));
  
  for (const m of toDeleteInvs) {
    await prisma.inventoryItem.delete({ where: { id: m.id } }).catch(e => {});
  }
  console.log("Child DB cleaned.");
}
main().finally(() => prisma.$disconnect());
