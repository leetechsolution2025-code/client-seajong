const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  console.log("Reading data from database...");
  
  const categoryTypes = await prisma.categoryTypeDef.findMany({
    orderBy: { sortOrder: "asc" }
  });
  
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" }
  });

  const content = `/**
 * seed-categories.js — Auto-generated on ${new Date().toISOString()}
 * Khởi tạo dữ liệu danh mục Master (CategoryTypeDef & Category)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const categoryTypes = ${JSON.stringify(categoryTypes, null, 2)};

const categories = ${JSON.stringify(categories, null, 2)};

async function main() {
  console.log('🌱 Seeding Category Types...');
  let createdTypes = 0;
  for (const t of categoryTypes) {
    const { createdAt, updatedAt, ...data } = t;
    await prisma.categoryTypeDef.upsert({ 
      where: { value: t.value }, 
      update: data, 
      create: data 
    });
    createdTypes++;
  }

  console.log('🌱 Seeding Categories...');
  // Chạy 2 lần: Lần 1 cho Parent, lần 2 cho Child (để không bị lỗi Foreign Key)
  let createdCats = 0;
  for (const c of categories) {
    if (!c.parentId) {
      const { createdAt, updatedAt, ...data } = c;
      await prisma.category.upsert({ 
        where: { id: c.id }, 
        update: data, 
        create: data 
      });
      createdCats++;
    }
  }
  for (const c of categories) {
    if (c.parentId) {
      const { createdAt, updatedAt, ...data } = c;
      await prisma.category.upsert({ 
        where: { id: c.id }, 
        update: data, 
        create: data 
      });
      createdCats++;
    }
  }
  console.log(\`✅ Done: \${createdTypes} types, \${createdCats} categories seeded.\`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
`;

  fs.writeFileSync(path.join(__dirname, "../prisma/seed-categories.js"), content);
  console.log("✅ Successfully updated prisma/seed-categories.js");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
