const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  // Xóa tất cả dữ liệu bảo hiểm giả
  const b = await prisma.insuranceBenefit.deleteMany({});
  const h = await prisma.insuranceHistory.deleteMany({});
  const c = await prisma.insuranceChange.deleteMany({});
  const cfg = await prisma.insuranceConfig.deleteMany({});
  
  console.log(`Đã xóa:`);
  console.log(`- InsuranceBenefit: ${b.count} bản ghi`);
  console.log(`- InsuranceHistory: ${h.count} bản ghi`);
  console.log(`- InsuranceChange: ${c.count} bản ghi`);
  console.log(`- InsuranceConfig: ${cfg.count} bản ghi`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
