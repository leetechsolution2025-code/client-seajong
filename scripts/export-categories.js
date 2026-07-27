const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching CategoryTypeDefs...');
  const categoryTypes = await prisma.categoryTypeDef.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  console.log('Fetching Categories...');
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  const content = `/**
 * seed-categories.js — Auto-generated cho client: seajong
 * Khởi tạo dữ liệu danh mục Master (CategoryTypeDef & Category)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const categoryTypes = ${JSON.stringify(categoryTypes, null, 2)};
const categories = ${JSON.stringify(categories, null, 2)};

async function main() {
  console.log('Seeding Master Categories...');

  for (const type of categoryTypes) {
    await prisma.categoryTypeDef.upsert({
      where: { value: type.value },
      update: {
        label: type.label,
        icon: type.icon,
        color: type.color,
        prefix: type.prefix,
        sortOrder: type.sortOrder,
        isSystem: type.isSystem,
        isActive: type.isActive
      },
      create: {
        id: type.id,
        value: type.value,
        label: type.label,
        icon: type.icon,
        color: type.color,
        prefix: type.prefix,
        sortOrder: type.sortOrder,
        isSystem: type.isSystem,
        isActive: type.isActive
      }
    });
  }

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {
        name: cat.name,
        type: cat.type,
        color: cat.color,
        icon: cat.icon,
        description: cat.description,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
        parentId: cat.parentId
      },
      create: {
        id: cat.id,
        code: cat.code,
        name: cat.name,
        type: cat.type,
        color: cat.color,
        icon: cat.icon,
        description: cat.description,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
        parentId: cat.parentId
      }
    });
  }

  console.log('Categories seeded successfully!');
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

  const outputPath = path.join(__dirname, '../prisma/seed-categories.js');
  fs.writeFileSync(outputPath, content);
  console.log('Successfully wrote to ' + outputPath);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
