const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const root = await prisma.inventoryCategory.findUnique({
    where: { code: 'SP_THANH_PHAM' }
  });
  if (!root) {
    console.log("No SP_THANH_PHAM in InventoryCategory");
    return;
  }

  async function migrateCategory(invCatId) {
    if (!invCatId) return null;
    const invCat = await prisma.inventoryCategory.findUnique({ where: { id: invCatId } });
    if (!invCat) return null;

    const codeToSearch = invCat.code || `CAT_${invCat.id.substring(0, 8)}`;
    let newCat = await prisma.category.findFirst({
      where: { code: codeToSearch, type: 'danh_muc_thanh_pham' }
    });

    if (newCat) return newCat;

    let newParentId = null;
    if (invCat.parentId) {
      const parentCat = await migrateCategory(invCat.parentId);
      if (parentCat) newParentId = parentCat.id;
    }

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

  await migrateCategory(root.id);
  const children = await prisma.inventoryCategory.findMany({ where: { parentId: root.id } });
  for (const child of children) {
    await migrateCategory(child.id);
    const subChildren = await prisma.inventoryCategory.findMany({ where: { parentId: child.id } });
    for (const sub of subChildren) {
       await migrateCategory(sub.id);
    }
  }
  console.log("Copied SP_THANH_PHAM tree.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
