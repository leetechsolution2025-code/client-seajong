const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.defectRecord.updateMany({
    where: { 
      reporterName: 'Phạm Quang Việt',
      reporterDepartment: 'Ban Giám đốc' 
    },
    data: { reporterDepartment: 'Kinh doanh' }
  });
  console.log("Updated defect records.");
}
main().finally(() => prisma.$disconnect());
