import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const prodRootCode = "SP_GO";
  const prodRootCategory = await prisma.category.findFirst({
    where: { code: prodRootCode, type: "danh_muc_thanh_pham", parentId: null, isActive: true }
  });
  console.log("prodRootCategory", prodRootCategory?.id);

  let industryProdCategoryIds: string[] = [];
  if (prodRootCategory) {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, parentId: true }
    });
    const descendantIds = [prodRootCategory.id];
    const collectDescendants = (parentId: string) => {
      categories.forEach(cat => {
        if (cat.parentId === parentId) {
          descendantIds.push(cat.id);
          collectDescendants(cat.id);
        }
      });
    };
    collectDescendants(prodRootCategory.id);
    industryProdCategoryIds = descendantIds;
  }
  
  const syncedCategories = await prisma.category.findMany({
    where: { type: { in: ['danh_muc_thanh_pham', 'vat_tu_san_xuat'] } },
    select: { id: true }
  });
  const syncedIds = syncedCategories.map(c => c.id);
  
  console.log("industryProdCategoryIds length", industryProdCategoryIds.length);
  console.log("syncedIds length", syncedIds.length);
  
  const items = await prisma.inventoryItem.findMany({
    where: {
      loai: "thanh-pham",
      ...(industryProdCategoryIds.length > 0 ? {
        OR: [
          { categoryId: { in: industryProdCategoryIds } },
          { categoryId: { in: syncedIds } },
          { categoryId: null }
        ]
      } : {})
    },
    select: { id: true }
  });
  console.log("Items found:", items.length);
}
main();
