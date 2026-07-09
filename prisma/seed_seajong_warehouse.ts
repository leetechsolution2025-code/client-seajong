import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.warehouse.upsert({
    where: { code: "KHO-HANGHOA" },
    update: { name: "Kho hàng hoá (Seajong)", type: "SEAJONG", isActive: true },
    create: { code: "KHO-HANGHOA", name: "Kho hàng hoá (Seajong)", type: "SEAJONG", address: "Trụ sở chính", isActive: true }
  });
  console.log("Added Kho hàng hoá (Seajong) to server");
}
main().catch(console.error).finally(() => prisma.$disconnect());
