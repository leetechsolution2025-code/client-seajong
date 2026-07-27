import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const orderCodes = ["DBH-20260726-01"];
  const movements = await prisma.stockMovement.findMany({
      where: {
        type: "xuat",
        OR: [
          ...orderCodes.map(code => ({ soChungTu: { contains: code } })),
          ...orderCodes.map(code => ({ lyDo: { contains: code } }))
        ]
      }
    });
  console.log(movements);
}
main().catch(console.error).finally(() => prisma.$disconnect());
