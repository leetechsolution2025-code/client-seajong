import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.dinhMucVatTu.findMany({
  where: { dinhMucId: "cmripk5or00018otakaid6bpn" },
  include: { material: true }
}).then(res => {
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
})
