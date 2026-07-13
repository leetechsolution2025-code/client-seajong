import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const inv = await prisma.inventoryItem.findMany();
  const invSen = inv.filter(x => x.tenHang.toLowerCase().includes('sen'));
  
  const mat = await (prisma as any).materialItem.findMany();
  const matSen = mat.filter((x: any) => x.name.toLowerCase().includes('sen'));
  
  console.log("InventoryItems:", invSen.length, invSen.map(x => x.tenHang + ' - ' + x.code));
  console.log("MaterialItems:", matSen.length, matSen.map((x: any) => x.name + ' - ' + x.code));
}

main().finally(() => prisma.$disconnect());
