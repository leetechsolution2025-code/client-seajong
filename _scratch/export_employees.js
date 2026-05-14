const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  console.log("Reading employees from database...");
  
  const employees = await prisma.employee.findMany({
    orderBy: { code: "asc" }
  });

  const content = `/**
 * seed-employees.js — Auto-generated on ${new Date().toISOString()}
 * Tạo nhân viên mẫu cho các phòng ban của client
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const employees = ${JSON.stringify(employees, null, 2)};

async function main() {
  console.log("🌱 Seeding employees...");
  let createdCount = 0;
  
  for (const emp of employees) {
    const { id, createdAt, updatedAt, ...data } = emp;
    
    // Đảm bảo các trường DateTime được chuyển đổi đúng
    if (data.birthDate) data.birthDate = new Date(data.birthDate);
    if (data.nationalIdDate) data.nationalIdDate = new Date(data.nationalIdDate);
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.contractSignDate) data.contractSignDate = new Date(data.contractSignDate);
    if (data.contractEndDate) data.contractEndDate = new Date(data.contractEndDate);

    await prisma.employee.upsert({
      where: { code: data.code },
      update: data,
      create: data,
    });
    createdCount++;
  }
  
  console.log(\`✅ Successfully seeded \${createdCount} employees.\`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

  fs.writeFileSync(path.join(__dirname, "../prisma/seed-employees.js"), content);
  console.log("✅ Successfully updated prisma/seed-employees.js with 48 records.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
