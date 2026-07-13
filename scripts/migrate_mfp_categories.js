const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting data migration for ManufacturedProduct categories...");

  // 1. Ensure CategoryTypeDef exists
  let typeDef = await prisma.categoryTypeDef.findUnique({
    where: { value: 'danh_muc_thanh_pham' }
  });
  if (!typeDef) {
    typeDef = await prisma.categoryTypeDef.create({
      data: {
        value: 'danh_muc_thanh_pham',
        label: 'Danh mục thành phẩm',
        icon: 'bi-box-seam',
        color: '#3b82f6', // blue
        prefix: 'SP'
      }
    });
    console.log("Created CategoryTypeDef: danh_muc_thanh_pham");
  } else {
    console.log("CategoryTypeDef 'danh_muc_thanh_pham' already exists.");
  }

  // 2. Find all InventoryCategory used by ManufacturedProduct
  const mfps = await prisma.manufacturedProduct.findMany({
    where: { categoryId: { not: null } }
  });

  console.log(`Found ${mfps.length} ManufacturedProduct items with existing categoryId.`);
  
  async function migrateCategory(invCatId) {
    if (!invCatId) return null;
    const invCat = await prisma.inventoryCategory.findUnique({ where: { id: invCatId } });
    if (!invCat) return null;

    // Check if already migrated
    const codeToSearch = invCat.code || `CAT_${invCat.id.substring(0, 8)}`;
    let newCat = await prisma.category.findFirst({
      where: { code: codeToSearch, type: 'danh_muc_thanh_pham' }
    });

    if (newCat) {
      return newCat;
    }

    // Need to migrate parent first
    let newParentId = null;
    if (invCat.parentId) {
      const parentCat = await migrateCategory(invCat.parentId);
      if (parentCat) {
        newParentId = parentCat.id;
      }
    }

    // Create new Category
    newCat = await prisma.category.create({
      data: {
        type: 'danh_muc_thanh_pham',
        code: codeToSearch,
        name: invCat.name,
        sortOrder: invCat.sortOrder || 0,
        isActive: invCat.isActive,
        parentId: newParentId,
      }
    });
    console.log(`Migrated Category: ${newCat.name}`);
    return newCat;
  }

  for (const p of mfps) {
    if (p.categoryId && !p.productCategoryId) {
      const newCat = await migrateCategory(p.categoryId);
      if (newCat) {
        await prisma.manufacturedProduct.update({
          where: { id: p.id },
          data: { productCategoryId: newCat.id }
        });
        console.log(`Updated ManufacturedProduct ${p.name} with new productCategoryId`);
      }
    }
  }

  // Also migrate the rest of the SP_VESINH tree just in case there are empty categories
  const spVesinh = await prisma.inventoryCategory.findUnique({ where: { code: 'SP_VESINH' } });
  if (spVesinh) {
    await migrateCategory(spVesinh.id);
    const children = await prisma.inventoryCategory.findMany({ where: { parentId: spVesinh.id } });
    for (const child of children) {
      await migrateCategory(child.id);
      const subChildren = await prisma.inventoryCategory.findMany({ where: { parentId: child.id } });
      for (const sub of subChildren) {
         await migrateCategory(sub.id);
      }
    }
  }

  console.log("Data migration completed successfully.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
