const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const item = await prisma.saleOrderItem.findUnique({
    where: { id: "cmrirh7vg00058oc1unbheghg" }
  });
  console.log(item);
}
main();
