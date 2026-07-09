const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const keywords = ["gỗ", "thép", "xi măng", "cát", "gạch", "sơn pu", "ván mdf", "nhám", "bản lề", "ray trượt", "tay nắm", "keo sữa", "lưỡi cưa", "picomat", "plywood", "melamine"];
  
  const mats = await prisma.materialItem.findMany();
  const toDeleteMats = mats.filter(m => keywords.some(k => m.name.toLowerCase().includes(k)));
  
  console.log("Deleting materials:", toDeleteMats.length);
  
  for (const m of toDeleteMats) {
    await prisma.materialItem.delete({ where: { id: m.id } }).catch(e => {});
  }
  
  const invs = await prisma.inventoryItem.findMany();
  const toDeleteInvs = invs.filter(m => keywords.some(k => m.tenHang.toLowerCase().includes(k)));
  
  console.log("Deleting inventory items:", toDeleteInvs.length);
  for (const m of toDeleteInvs) {
    await prisma.inventoryItem.delete({ where: { id: m.id } }).catch(e => {});
  }
  
  console.log("Cleanup done.");
}
main().finally(() => prisma.$disconnect());
