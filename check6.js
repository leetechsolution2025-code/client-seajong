const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const whs = await prisma.warehouse.findMany();
  console.log(whs.map(w => ({ id: w.id, code: w.code, name: w.name, type: w.type })));
}
main();
