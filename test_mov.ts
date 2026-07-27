import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const orderId = "cms1m26we001h8ogf8049fu5a";
  const orderCodes = ["DBH-20260726-01"];
  const movements = orderCodes.length > 0 ? await prisma.stockMovement.findMany({
      where: {
        type: "xuat",
        OR: [
          ...orderCodes.map(code => ({ soChungTu: { contains: code } })),
          ...orderCodes.map(code => ({ lyDo: { contains: code } }))
        ]
      }
    }) : [];
  
  console.log("Movements count:", movements.length);
  const processedOrderCodes = new Set<string>();
  movements.forEach(mv => {
      orderCodes.forEach(code => {
        if ((mv.soChungTu && mv.soChungTu.includes(code)) || (mv.lyDo && mv.lyDo.includes(code))) {
          processedOrderCodes.add(code);
        }
      });
    });
  
  console.log("Processed:", Array.from(processedOrderCodes));
}
main().catch(console.error).finally(() => prisma.$disconnect());
