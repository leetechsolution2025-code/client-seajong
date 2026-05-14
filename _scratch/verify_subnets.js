const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const subnets = await prisma.branchSubnet.findMany({
    include: { branch: true }
  });
  
  console.log('--- KIỂM TRA DỮ LIỆU TRONG DATABASE ---');
  if (subnets.length === 0) {
    console.log('Chưa có dải IP nào được lưu.');
  } else {
    subnets.forEach((s, i) => {
      console.log(`${i+1}. Nơi làm việc: ${s.branch?.name || 'Chưa xác định'}`);
      console.log(`   Dải IP: ${s.startIp} -> ${s.endIp}`);
      console.log(`   ID liên kết: ${s.branchId}`);
      console.log('-----------------------------------');
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
